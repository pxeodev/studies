import { useMediaQuery } from 'react-responsive'

const useBreakPoint = () => {
  const xl = useMediaQuery({ query: '(min-width: 1440px)' })
  const lg = useMediaQuery({ query: '(min-width: 900px)' })
  const md = useMediaQuery({ query: '(min-width: 600px)' })
  const sm = useMediaQuery({ query: '(min-width: 480px)' })

  return { xl, lg, md, sm }
}

export default useBreakPoint;