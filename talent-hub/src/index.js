import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App';

// Server ko app load hote hi wake up karo
fetch('https://talenthub-w1cc.onrender.com/health').catch(() => {});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId="171142887054-79f8f7jusmm4cmaevce5p8gv6c5g82o0.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);