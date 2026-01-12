import React from 'react';
import classnames from 'classnames';
import shumiStyles from '../../styles/shumi.module.less';

// Simple wrapper for Suggestion component matching Vercel AI SDK API
export const Suggestion = ({ suggestion, onClick, ...props }) => {
  return (
    <div
      className={classnames(shumiStyles.suggestionButton, props.className)}
      onClick={() => onClick?.(suggestion)}
      {...props}
    >
      {suggestion}
    </div>
  );
};

// Container for suggestions
export const Suggestions = ({ children, ...props }) => {
  return (
    <div className={classnames(shumiStyles.suggestions, props.className)} {...props}>
      {children}
    </div>
  );
};
