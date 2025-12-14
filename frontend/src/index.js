import ReactDOM from 'react-dom/client';
import './index.css';
import Router from './router/router';
import { BrowserRouter } from 'react-router-dom';
import './language/config';
import { AuthAdminProvider } from './admin/context/authAdmin';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <AuthAdminProvider>
      <Router />
    </AuthAdminProvider>
  </BrowserRouter>
);