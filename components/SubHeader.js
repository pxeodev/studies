import Search from './Search'

import subHeaderStyles from '../styles/subheader.module.less'

const SubHeader = ({ render, categories, coins }) => {
  if (!render) { return null; }

  return (
    <div className={subHeaderStyles.subheader}>
      <Search categories={categories} coins={coins} />
    </div>
  );
}

export default SubHeader