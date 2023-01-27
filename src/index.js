import React from 'react';
import { render } from 'react-dom';
import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as serviceWorker from './serviceWorker';
import Firebase, { FirebaseContext } from './components/Firebase';
import { HelmetProvider } from 'react-helmet-async';

//const root = createRoot(document.getElementById("root"));
render(
  <React.StrictMode>
    <FirebaseContext.Provider value={new Firebase()}>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </FirebaseContext.Provider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
