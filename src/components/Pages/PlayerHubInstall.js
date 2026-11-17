import React from 'react';
import shieldLogo from '../../assets/usairsoft-small-logo.png';

export const companionInstallUrl = 'https://app.usairsoftfield.com/#install';

export default function PlayerHubInstall() {
  return (
    <section className="ph-install" aria-labelledby="player-hub-install-heading">
      <div className="ph-install-copy">
        <img className="ph-install-logo" src={shieldLogo} alt="US Airsoft World" width="48" height="56" />
        <h2 id="player-hub-install-heading">Install the USAW Field Companion</h2>
        <p>Keep your player card, live games, patches, and field tools on your phone.</p>
        <a className="ph-button ph-button-primary" href={companionInstallUrl}>Install the app</a>
        <p className="ph-install-help">iPhone · Add to Home Screen<br />Android · Install app or Add to Home screen</p>
      </div>
      <figure className="ph-install-qr">
        <a href={companionInstallUrl} aria-label="Open the USAW app installation page">
          <img src="/assets/usaw-companion-install-qr.png" width="180" height="180"
            alt="Scan to install the USAW Field Companion on your phone" />
        </a>
        <figcaption>Scan with your phone camera</figcaption>
      </figure>
    </section>
  );
}
