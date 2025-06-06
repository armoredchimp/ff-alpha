<script>
	import axios from 'axios';
  import { signUp, confirmSignUp, signIn, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
  import { setRegStatus, userStore, setUser } from '$lib/stores/userStore.svelte';
  import { setLeagueStatus, getLeagueState } from '$lib/stores/league.svelte';
	import { goto } from '$app/navigation';
  
  const POST_LOGIN_URL = import.meta.env.VITE_AWS_POST_LOGIN_URL

  let registering = $state(false);
  let displayConfirmCodes = $state(false)
  let emailValue = $state('');
  let passwordValue = $state('');
  let confirmationCodeDigits = $state(['', '', '', '', '', '']);
  let codeInputs = [];

  async function checkUserLeagueStatus() {
      const leagueState = getLeagueState();
      
      try {
          leagueState.loading = true;
          leagueState.error = null;
          
          // Get the auth session with ID token
          const session = await fetchAuthSession();
          const idToken = session.tokens?.idToken?.toString();
          
          if (!idToken) {
              throw new Error('No authentication token available');
          }
          
          // Call your API Gateway endpoint with axios
          const response = await axios.get(`${POST_LOGIN_URL}`, {
              headers: {
                  'Authorization': idToken
              }
          });
          
          console.log('League status:', response.data);
          
          setLeagueStatus(response.data);
          
          return response.data;
          
      } catch (error) {
          console.error('Error checking league status:', error);
          
          if (error.response) {
              // Server responded with error status
              leagueState.error = `Server error: ${error.response.status}`;
              throw new Error(`Failed to check league status: ${error.response.status}`);
          } else if (error.request) {
              // Request made but no response
              leagueState.error = 'No response from server';
              throw new Error('No response from server');
          } else {
              // Other error
              leagueState.error = error.message;
              throw error;
          }
      } finally {
          leagueState.loading = false;
      }
  }
  
  async function registerUser(values){
    try {
      const { isSignUpComplete, userId, nextStep } = await signUp({
      username: values.email,
      password: values.password
    })
    // if(isSignUpComplete){
    //   userStore.regStatus({
    //     completed: true,
    //     username: email
    //   })
    // }
    } catch(error){
      console.error("Error during registration:", error);
    }
  }

  async function signUserIn(values){
    try {
        const { isSignedIn, nextStep } = await signIn({
            username: values.email,
            password: values.password,
        });
        
        if (isSignedIn) {
            const currentUser = await getCurrentUser();
            console.log('Current user:', currentUser); 
            setUser(currentUser);
            
            // Create server session
            console.log('Attempting to create session...'); 
            
            const sessionResponse = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    userId: currentUser.userId, 
                    username: currentUser.username 
                })
            });
            
            console.log('Session response status:', sessionResponse.status); 
            
            if (sessionResponse.ok) {
                const result = await sessionResponse.json();
                console.log('Session result:', result); 

                try {
                  const leagueInfo = await checkUserLeagueStatus();
                  displayConfirmCodes = false;
                  emailValue = '';
                  passwordValue = '';
                  console.log(`Successfully logged in!`, currentUser);

                  if (leagueInfo.status === 'HAS_LEAGUE'){
                    goto('teams/player/main')
                  } else if (leagueInfo.status === 'CAN_CREATE_LEAGUE') {
                    goto('/create')
                  }

                } catch(err){
                  console.error('Failed to check league status', err)
                }
                
                
                // goto('/draft');
            } else {
                const errorText = await sessionResponse.text();
                console.error('Failed to create session:', errorText);
            }
        } else {
            console.log('Failed to Login');
        }
    } catch(err) {
        console.error('Login error', err);
    }
}

  async function triggerRegistration() {
    await registerUser({ email: emailValue, password: passwordValue });
    displayConfirmCodes = true;
  }

  function triggerSignIn() {
    signUserIn({ email: emailValue, password: passwordValue })
  }

  function handleCodeInput(event, index){
    const input = event.target;
    let value = input.value;

    if(/[^0-9]/.test(value)){
      input.value = value.replace(/[^0-9]/g, '')
      value = input.value;
    }

    if(value.length > 1) {
      input.value = value.substring(0, 1);
    }
    confirmationCodeDigits[index] = input.value;

    if (input.value.length === 1 && index < 5 && codeInputs[index + 1]) {
      codeInputs[index + 1].focus();
    }

  }

  function handleCodeKeyDown(event, index) {
    if (event.key === 'Backspace') {
      confirmationCodeDigits[index] = ''; 
      if (event.target.value === '' && index > 0 && codeInputs[index - 1]) {
        codeInputs[index - 1].focus();
      }
    } else if (event.key === 'ArrowLeft' && index > 0 && codeInputs[index - 1]) {
      codeInputs[index - 1].focus();
    } else if (event.key === 'ArrowRight' && index < 5 && codeInputs[index + 1]) {
      codeInputs[index + 1].focus();
    }
  }

  function handlePaste(event) {
    event.preventDefault();
    const pasteData = (event.clipboardData || window.clipboardData).getData('text');
    const digits = pasteData.replace(/[^0-9]/g, '').split('');
    
    digits.slice(0, 6).forEach((digit, i) => {
      confirmationCodeDigits[i] = digit;
      if (codeInputs[i]) {
        codeInputs[i].value = digit;
      }
    });

    const focusIndex = Math.min(Math.max(0, digits.length - 1), 5);
    if (codeInputs[focusIndex]) {
      codeInputs[focusIndex].focus();
    }
  }

  async function handleCodeVerification() {
    const code = confirmationCodeDigits.join('');
    if (code.length !== 6) {
      console.error('Confirmation code must be 6 digits.');
      return;
    }
    try {
      const { isSignUpComplete, nextStep } = await confirmSignUp({
        username: emailValue,
        confirmationCode: code
      });

      if (isSignUpComplete) {
        console.log('Sign up confirmed successfully!');
        registering = false
        setRegStatus({
          completed: true,
          username: emailValue
        });
        displayConfirmCodes = false;
        confirmationCodeDigits = ['', '', '', '', '', ''];
        passwordValue = ''; 

        await signUserIn({ email: emailValue, password: passwordValue})
      } else {
        console.log('Confirmation not complete. Next step:', nextStep);
      }
    } catch (error) {
      console.error('Error confirming sign up:', error);
    }
  }
</script>


<div class="login-page-container">
  {#if !displayConfirmCodes}
  <div class="content-wrapper">
    <header>
      <h1>Sparrow Football</h1>
    </header>

    <main class="login-section">
      <div class="input-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" bind:value={emailValue}/>
      </div>
      <div class="input-group">
        <label for="password">Password</label>
        {#if registering}
          <h6>Passwords must be 8+ characters long, and contain at least one special character and upper/lowercase letters</h6>
        {/if}
        <input type="password" id="password" bind:value={passwordValue} />
      </div>
      <button type="submit" class="confirm-button" onclick={registering ? triggerRegistration : triggerSignIn}>Confirm</button>
      <button class="forgot-password-button">Forgot Password?</button>
      {#if !registering}
        <button class="signup-button" onclick={() => registering = true}>Sign Up</button>
      {/if}
    </main>
  </div>
  {:else}
  <div class="content-wrapper confirm-code-wrapper">
    <header>
      <h1>Enter Confirmation Code</h1>
    </header>
    <main class="login-section">
      <p class="confirm-code-instruction">
        A 6-digit code was sent to your email. Please enter it below.
      </p>
      <div class="confirm-code-inputs" onpaste={handlePaste}>
              {#each confirmationCodeDigits as digit, i}
                  <input 
                    bind:this={codeInputs[i]}
                    type="text" 
                    inputmode="numeric" 
                    maxlength="1" 
                    class="code-input" 
                    aria-label={`Confirmation code digit ${i + 1}`}
                    bind:value={confirmationCodeDigits[i]}
                    oninput={(event) => handleCodeInput(event, i)}
                    onkeydown={(event) => handleCodeKeyDown(event, i)}
                  />
                {/each}
              </div>
              <button type="button" class="confirm-button" onclick={handleCodeVerification}>Verify Code</button>
              <button class="signup-button" onclick={() => {displayConfirmCodes = false; confirmationCodeDigits = ['', '', '', '', '', ''];}}>Back to Login</button>
            </main>
  </div>
  {/if}
</div>

<style>
  .login-page-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 20px;
    background-color: #f0f2f5;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
                 Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  .content-wrapper {
    background-color: #ffffff;
    padding: 35px 40px;
    border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.07);
    width: 100%;
    max-width: 360px;
    text-align: center;
    border: 1px solid #e0e0e0;
  }

  .confirm-code-wrapper header h1 {
    font-size: 1.8rem;
  }
  
  .confirm-code-instruction {
    font-size: 0.9rem;
    color: #333;
    margin-bottom: 20px;
    line-height: 1.5;
  }

  .confirm-code-inputs {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 20px;
  }

  .code-input {
    width: calc((100% - 50px) / 6);
    height: 50px;
    text-align: center;
    font-size: 1.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-sizing: border-box;
    transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  }

  .code-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }


  header h1 {
    font-size: 2.1rem;
    font-weight: 300;
    color: #2c3e50;
    margin: 0 0 30px 0;
  }

  .login-section {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .input-group {
    text-align: left;
  }

  .input-group label {
    display: block;
    font-size: 0.8rem;
    color: #333;
    margin-bottom: 7px;
    font-weight: 500;
  }

  .input-group h6 {
    font-size: 0.7rem;
    color: #555;
    margin-top: -5px;
    margin-bottom: 5px;
    font-weight: 400;
  }

  .input-group input {
    width: 100%;
    padding: 11px 14px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
    box-sizing: border-box;
    transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  }

  .input-group input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  .confirm-button {
    background-color: #3b82f6;
    color: white;
    border: none;
    padding: 11px 15px;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
    margin-top: 8px;
  }

  .confirm-button:hover {
    background-color: #2563eb;
  }

  .forgot-password-button {
    background-color: transparent;
    color: #3b82f6;
    border: none;
    padding: 7px 0;
    font-size: 0.8rem;
    cursor: pointer;
    text-align: center;
    margin-top: 3px;
    font-weight: 500;
    transition: color 0.2s ease-in-out;
  }

  .forgot-password-button:hover {
    color: #2563eb;
    text-decoration: underline;
  }

  .signup-button {
    background-color: transparent;
    color: #3b82f6;
    border: none;
    padding: 7px 0;
    font-size: 0.8rem;
    cursor: pointer;
    text-align: center;
    margin-top: 3px;
    font-weight: 500;
    transition: color 0.2s ease-in-out;
  }

  .signup-button:hover {
    color: #2563eb;
    text-decoration: underline;
  }
</style>