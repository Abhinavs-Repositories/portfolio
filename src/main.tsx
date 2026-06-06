import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';

// Console easter egg for anyone who pops the inspector.
const bone = 'background:#16140f;color:#f4f1ea;padding:6px 10px;font:13px/1.4 Georgia,serif';
const amber = 'background:#16140f;color:#c8862b;padding:6px 10px;font:13px/1.4 Georgia,serif;font-style:italic';
// eslint-disable-next-line no-console
console.log(
  '%cHello there.%c Built by hand. Code on the runway → github.com/Abhinavs-Repositories',
  amber,
  bone,
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
