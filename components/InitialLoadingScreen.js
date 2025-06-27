import { useState, useEffect } from 'react';
import styles from '../styles/initialLoading.module.css';

const InitialLoadingScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const loadingSteps = [
    "Initializing crypto intelligence...",
    "Connecting to blockchain networks...",
    "Loading market data...",
    "Preparing your dashboard..."
  ];

  useEffect(() => {
    // Step through loading messages
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % loadingSteps.length);
    }, 1200);

    // Hide the loading screen after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(timer);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.loadingScreen}>
      <div className={styles.chatInterface}>
        <div className={styles.chatHeader}>
          <div className={styles.headerLogo}>
            <svg className={styles.mushroomIcon} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="capGradient" cx="50%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ff6b6b" />
                  <stop offset="100%" stopColor="#ee5a24" />
                </radialGradient>
                <linearGradient id="stemGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f8f9fa" />
                  <stop offset="100%" stopColor="#e9ecef" />
                </linearGradient>
              </defs>
              
              <ellipse cx="50" cy="35" rx="35" ry="20" fill="url(#capGradient)" />
              
              <circle cx="35" cy="30" r="3" fill="white" opacity="0.8" />
              <circle cx="45" cy="25" r="2" fill="white" opacity="0.6" />
              <circle cx="60" cy="28" r="2.5" fill="white" opacity="0.7" />
              <circle cx="55" cy="35" r="1.5" fill="white" opacity="0.5" />
              
              <rect x="45" y="45" width="10" height="25" rx="5" fill="url(#stemGradient)" />
              
              <ellipse cx="50" cy="72" rx="8" ry="3" fill="#dee2e6" opacity="0.6" />
              
              <circle cx="42" cy="32" r="1" fill="#c92a2a" />
              <circle cx="58" cy="30" r="1" fill="#c92a2a" />
            </svg>
          </div>
        </div>

        <div className={styles.loadingContent}>
          <div className={styles.mainTitle}>Loading</div>
          <div className={styles.subtitle}>Shumi Intelligence</div>
          
          <div className={styles.loadingDots}>
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div className={styles.statusMessage}>
            {loadingSteps[currentStep]}
          </div>

          <div className={styles.progressBar}>
            <div className={styles.progressFill}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitialLoadingScreen;