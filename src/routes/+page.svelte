<script>
  import { signUp, confirmSignUp, signIn, getCurrentUser } from 'aws-amplify/auth';
  import 

</script>

<div class="login-page-container">
  <div class="content-wrapper">
    <header>
      <h1>Sparrow Football</h1>
    </header>

    <main class="login-section">
      <div class="input-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" />
      </div>
      <div class="input-group">
        <label for="password">Password</label>
        <input type="password" id="password" />
      </div>
      <button type="submit" class="confirm-button">Confirm</button>
      <button class="forgot-password-button">Forgot Password?</button>
    </main>
  </div>
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
</style>