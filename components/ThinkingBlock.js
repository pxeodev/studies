import { useState, useEffect } from 'react';
import { Card, Space, Progress } from 'antd';
import shumiStyles from '../styles/shumi.module.less';

/**
 * ShumiThoughtProcess - Crypto-native thinking display with animated progress
 * 
 * @param {Array} thinking - Array of thinking steps
 * @param {boolean} isStreaming - Whether AI is currently thinking
 */
const ThinkingBlock = ({ thinking = [], isStreaming = false }) => {
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  if (!thinking || thinking.length === 0) return null;
  
  // Animate progress while streaming - slower for realistic timing
  useEffect(() => {
    if (!isStreaming) {
      setCurrentProgress(100);
      return;
    }
    
    // Start from 5% and gradually increase
    setCurrentProgress(5);
    
    let progress = 5;
    let stepIndex = 0;
    
    const interval = setInterval(() => {
      // Much slower increment: 1-3% per tick (was 2-10%)
      progress += Math.random() * 2 + 1;
      
      if (progress >= 100) {
        progress = 90; // Cap at 90% until truly complete
      }
      
      setCurrentProgress(Math.min(progress, 90));
      
      // Advance steps as progress increases
      const newStepIndex = Math.floor((progress / 100) * thinking.length);
      if (newStepIndex !== stepIndex && newStepIndex < thinking.length) {
        stepIndex = newStepIndex;
        setCurrentStepIndex(stepIndex);
      }
    }, 800); // Update every 800ms (was 400ms) for slower animation
    
    return () => clearInterval(interval);
  }, [isStreaming, thinking.length]);
  
  // Get current step to display
  const currentStep = thinking[currentStepIndex] || thinking[0];
  
  return (
    <div className={shumiStyles.thinkingBlock}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {/* Header - professional, no emoji */}
        <div className={shumiStyles.thinkingTitle}>
          Analyzing...
        </div>
        
        {/* Animated progress bar with gradient */}
        <Progress
          percent={currentProgress}
          showInfo={false}
          strokeColor={{
            '0%': '#ff4d4d',
            '100%': '#ff8a8a',
          }}
          trailColor="rgba(255, 77, 77, 0.1)"
          strokeWidth={4}
          style={{ margin: 0 }}
        />
        
        {/* Current step - no emoji */}
        {currentStep && (
          <div className={shumiStyles.currentStep}>
            {currentStep.title}
          </div>
        )}
      </Space>
    </div>
  );
};

export default ThinkingBlock;

