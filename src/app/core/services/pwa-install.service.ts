import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private deferredPrompt: any = null;
  
  // Signals
  isInstallable = signal(false);
  isIos = signal(false);
  showIosInstructions = signal(false);
  installed = signal(false);

  constructor() {
    this.initPwaLogic();
  }

  private initPwaLogic() {
    // Detect if running on iOS (Safari/Chrome on iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    this.isIos.set(isIosDevice);

    // Detect if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    this.installed.set(isStandalone);

    if (isStandalone) {
      // If already installed, we don't need to do anything else
      return;
    }

    // Listen for the standard install prompt (Android/Desktop)
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      this.deferredPrompt = e;
      // Update UI notify the user they can add to home screen
      this.isInstallable.set(true);
    });

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.isInstallable.set(false);
      this.deferredPrompt = null;
      console.log('PWA was installed successfully');
    });

    // If it's iOS and not standalone, we consider it "installable" via instructions
    if (isIosDevice && !isStandalone) {
      this.isInstallable.set(true);
    }
  }

  async promptInstall() {
    if (this.isIos()) {
      // Show custom iOS instructions
      this.showIosInstructions.set(true);
      return;
    }

    if (this.deferredPrompt) {
      // Show the install prompt
      this.deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // We've used the prompt, and can't use it again, throw it away
      this.deferredPrompt = null;
      this.isInstallable.set(false);
    }
  }

  closeIosInstructions() {
    this.showIosInstructions.set(false);
  }
}
