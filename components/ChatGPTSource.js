import styles from '../styles/chat-gpt-source.module.less'

const ChatGPTSource = () => {
  return (
    <div className={styles.sectionDescriptionSource}>
      {/* eslint-disable @next/next/no-img-element */}
      <img src="/chat-gpt-logo.jpeg" alt="Chat GPT Logo" className={styles.sectionDescriptionSourceGPTLogo} />
      <img src="/claude.svg" alt="Claude Logo" className={styles.sectionDescriptionSourceGPTLogo} />
      {/* eslint-enable @next/next/no-img-element */}
      <span className={styles.sectionDescriptionSourceGPTSummarized}>Summarized in part by</span>&nbsp;ChatGPT 4 and Claude
    </div>
  );
}

export default ChatGPTSource