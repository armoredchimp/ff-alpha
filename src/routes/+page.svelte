<script>
	import axios from 'axios';
    import { signUp, confirmSignUp, signIn, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
    import { setRegStatus, setUser } from '$lib/stores/userStore.svelte';
    import { draft } from '../lib/stores/draft.svelte';
    import { setLeagueStatus, getLeagueState } from '$lib/stores/league.svelte';
    import { goto, invalidateAll } from '$app/navigation';
    import { loadTeamsData } from '$lib/loading/teams/loadTeams.js'
    import { hydratePlayers } from '$lib/loading/players/hydratePlayers.js'
    import { hydrateTeams } from '$lib/loading/teams/hydrateTeams.js'
    import { loadPlayersData } from '$lib/loading/players/loadPlayers.js'
    import { loadManagersData } from '$lib/loading/managers/loadManagers.js'
    import { hydrateManagers } from '$lib/loading/managers/hydrateManagers.js'
	  import { delay } from '../lib/utils';
    
    const POST_LOGIN_URL = import.meta.env.VITE_AWS_POST_LOGIN_URL

    let registering = $state(false);
    let displayConfirmCodes = $state(false);
    let emailValue = $state('');
    let passwordValue = $state('');
    let confirmationCodeDigits = $state(['', '', '', '', '', '']);
    let codeInputs = [];
    let tempPassword = ''; 

async function checkUserLeagueStatus() {
    const leagueState = getLeagueState();
    
    try {
        leagueState.loading = true;
        leagueState.error = null;
        
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();
        
        if (!idToken) {
            throw new Error('No authentication token available');
        }
        
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
            leagueState.error = `Server error: ${error.response.status}`;
            throw new Error(`Failed to check league status: ${error.response.status}`);
        } else if (error.request) {
            leagueState.error = 'No response from server';
            throw new Error('No response from server');
        } else {
            leagueState.error = error.message;
            throw error;
        }
    } finally {
        leagueState.loading = false;
    }
}
    
async function registerUser(values){
        tempPassword = values.password;
        try {
            const { isSignUpComplete, userId, nextStep } = await signUp({
                username: values.email,
                password: values.password
            });
            
            // if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
            //     // Store password for later use after confirmation
            //     tempPassword = values.password;
            // }
        } catch(error){
            console.error("Error during registration:", error);
            alert(error.message || "Registration failed. Please try again.");
        }
    }


async function signUserIn(values) {
    try {
        const { isSignedIn } = await signIn({
            username: values.email,
            password: values.password,
        });
        
        if (isSignedIn) {
            const currentUser = await getCurrentUser();
            console.log('Current user:', currentUser);
            setUser(currentUser);
            
            try {
                // Check league status using AWS Lambda
                const leagueInfo = await checkUserLeagueStatus();
                
                // Create session with auth info AND league ID if they have one
                const sessionResponse = await axios.post('/api/auth/session', {
                    userId: currentUser.userId,
                    username: values.email,
                    leagueId: leagueInfo.leagueId || null
                });
                
                if (sessionResponse.status === 200) {
                    displayConfirmCodes = false;
                    emailValue = '';
                    passwordValue = '';
                    console.log(`Successfully logged in!`, currentUser);
                    
                    await invalidateAll();
                    
                    if (leagueInfo.status === 'HAS_LEAGUE' && leagueInfo.leagueId) {
                        // Fetch league info (draft status and countries code) FIRST
                        const leagueData = await fetchLeagueInfo();
                        
                        if (leagueData) {
                            const countriesCode = leagueData.countriesCode;
                            
                            // Load players from the appropriate table based on countries code
                            await Promise.all([
                                loadPlayersData(countriesCode), 
                                loadManagersData()
                            ]);
                            
                            await handlePostLeagueLoad(leagueData);
                        }
                    } else if (leagueInfo.status === 'CAN_CREATE_LEAGUE') {
                        goto('/create');
                    }
                }
            } catch(err) {
                console.error('Failed to check league status or create session', err);
                alert('Login successful but failed to load league data. Please refresh the page.');
            }
        } else {
            console.log('Failed to Login');
            alert('Invalid email or password');
        }
    } catch(err) {
        console.error('Login error', err);
        alert(err.message || 'Login failed. Please try again.');
    }
}


async function fetchLeagueInfo() {
    try {
        const response = await axios.get('/api/supabase/league_info'); 
        
        return response.data; // Returns { draftComplete, countriesCode, redirect }
    } catch (error) {
        console.error('Error fetching league info:', error);
        return null;
    }
}

async function handlePostLeagueLoad(leagueData) {
    try {
        if (leagueData.draftComplete) {
            draft.gate0 = true;
            draft.gate1 = true;
            draft.complete = true;
            
            // Load teams and wait for it to complete
            const teamsLoaded = await loadTeamsData();
            
            if (teamsLoaded && leagueData.redirect) {
                delay(100);
                hydratePlayers();
                delay(100);
                try {
                    hydrateTeams();
                } catch(err) {
                    console.error('error hydrating teams', err);
                }
                delay(100);
                hydrateManagers();
                goto(leagueData.redirect);
            }
        } else if (leagueData.redirect) {
            goto(leagueData.redirect);
        }
    } catch (error) {
        console.error('Error in post-league load:', error);
        // Default to draft page if there's an error
        goto('/draft');
    }
}

async function triggerRegistration() {
    if (!emailValue || !passwordValue) {
        alert('Please enter both email and password');
        return;
    }
    await registerUser({ email: emailValue, password: passwordValue });
    displayConfirmCodes = true;
}

function triggerSignIn() {
    if (!emailValue || !passwordValue) {
        alert('Please enter both email and password');
        return;
    }
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
        alert('Please enter all 6 digits of the confirmation code');
        return;
    }
    
    try {
        const { isSignUpComplete, nextStep } = await confirmSignUp({
            username: emailValue,
            confirmationCode: code
        });

        if (isSignUpComplete) {
            console.log('Sign up confirmed successfully!');
            registering = false;
            setRegStatus({
                completed: true,
                username: emailValue
            });
            
            // Auto-login after successful confirmation
            await signUserIn({ email: emailValue, password: tempPassword });
            
            // Clear sensitive data
            tempPassword = '';
            confirmationCodeDigits = ['', '', '', '', '', ''];
        } else {
            console.log('Confirmation not complete. Next step:', nextStep);
        }
    } catch (error) {
        console.error('Error confirming sign up:', error);
        alert(error.message || 'Invalid confirmation code. Please try again.');
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