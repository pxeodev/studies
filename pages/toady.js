import globalData from '../lib/globalData'
import ToadyComponent from '../components/Toady'; // Restore original component import

export async function getStaticProps() {
  const appData = await globalData()
  return {
    props: {
      appData,
    },
  }
}

const ToadyPage = () => {
  return (
    <ToadyComponent isActive={true} />
  );
};

export default ToadyPage;