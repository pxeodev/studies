import styles from '../styles/chat-gpt-source.module.less'

const ChatGPTSource = () => {
  return (
    <div className={styles.sectionDescriptionSource}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/chat-gpt-logo.jpeg" alt="Chat GPT Logo" className={styles.sectionDescriptionSourceGPTLogo} />
      <span className={styles.sectionDescriptionSourceGPTSummarized}>Summarized in part by</span>&nbsp;ChatGPT 3.5
    </div>
  );
}

export default ChatGPTSource