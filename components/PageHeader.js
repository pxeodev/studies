import styles from "../styles/pageheader.module.less"
import ExplainerModal from './ExplainerModal';

const PageHeader = ({ title, explainer, showSource, prefix, postfix, lastUpdated }) => {
  // Replace mushroom emoji with Shumi logo for Shumi pages
  const processedTitle = typeof title === 'string' ? title.replace(/🍄/g, '') : title;
  const isShumiPage = (typeof title === 'string' && title.includes('Shumi')) || (typeof title === 'string' && title.includes('🍄'));

  return (
    <div className={styles.header}>
      {prefix}
      {isShumiPage && (
        <img src="/shumi.png" alt="Shumi" width="24" height="24" />
      )}
      <h1 className={styles.title}>{processedTitle}</h1>
      {explainer && (
        <ExplainerModal
          title={title}
          explainer={explainer}
          showSource={showSource}
          lastUpdated={lastUpdated}
        />
      )}
      {postfix}
    </div>
  );
}

export default PageHeader