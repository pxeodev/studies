import '../styles/globals.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import Head from 'next/head'
import Navbar from 'react-bootstrap/Navbar'
import Container from 'react-bootstrap/Container'

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Supertrend Matrix</title>
        <meta name="description" content="Daily Supertrend values for the top 100 crypto currency tokens."/>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
        <Navbar collapseOnSelect expand="lg" bg="dark" variant="dark">
          <Container>
            <Navbar.Brand href="#home">Supertrend Matrix</Navbar.Brand>
            <Navbar.Toggle aria-controls="responsive-navbar-nav" />
            <Navbar.Collapse id="responsive-navbar-nav">
            </Navbar.Collapse>
          </Container>
        </Navbar>
        <Component {...pageProps} className="mt-5" />
    </>
  )
}

export default MyApp
