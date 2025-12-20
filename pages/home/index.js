import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import FeaturesSection from '../../components/FeaturesSection'
import FeatureCard from '../../components/FeatureCard'
import { useTranslations } from 'next-intl'
import Header from '../../components/Header'
import Button from '../../components/Button'
import TrustBadge from '../../components/TrustBadge'
import Footer from '../../components/Footer'
import CookieBanner from '../../components/CookieBanner'
import SectionHeading from '../../components/SectionHeading'
import InfoSection from '../../components/InfoSection'
import dynamic from 'next/dynamic';
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
import solairaHouseAnimation from "../../public/solaira_house.json";
import styles from './styles.module.css';

const HomePage = (props) => {
  return (
    <>
      <div className={styles.container100}>
        <Head>
          <title>Solaira - Smart Energy Solutions</title>
          <meta name="description" content="Solaira provides intelligent home battery systems. Save up to 1200 TND every month with clean, smart energy." />
          <meta property="og:title" content="Solaira - Smart Energy Solutions" />
          <link rel="canonical" href="https://untitled-vjvsif.teleporthq.app/" />
        </Head>
        
        <div className={styles.frame1920wlight}>
          <div className={styles.frame1}>
            <Header
              className={styles.group3}
              email="Info@solaira.tn"
              phone="(+216) 99-999-999"
              logoImage="flag_of_Tunisia.svg"
              logoAlt="SVG6578a5b54fa1fa278cef6591footerlogosvgfill1666"
              navItems={[
                'Home Battery',
                'Solar Panels',
                'About Us',
                'Blog',
                'Contact',
              ]}
              contactButtonText="Contact"
            />
            
            <div className={styles.group2}>
              <div className={styles.container104}>
                {/* Updated button with navigation */}
                <Link href="/contact">
                  <Button className={styles.component12}>
                    Contact
                  </Button>
                </Link>
              </div>
              
              <div className={styles.group1}>
                <div className={styles.section1}>
                  <div className={styles.container108}>
                    <div className={styles.heading1margin}>
                      <div className={styles.heading1}>
                        <span className={`${styles.text122} www.solaira.tnSemanticHeading1`}>
                          <span className={styles.text123}>
                            🌞Solaira,
                          </span>
                          <br></br>
                          <span className={styles.text125}>
                            Where Energy Becomes Intelligent.
                          </span>
                          <br></br>
                        </span>
                      </div>
                    </div>
                    
                    <div className={styles.margin14}>
                      <span className={`${styles.text128} www.solaira.tnOutfitLight8`}>
                        <span className={styles.text129}>
                          With Solaira,
                          <span dangerouslySetInnerHTML={{ __html: ' ' }} />
                        </span>
                        <span className={styles.text130}>
                          households save up to
                        </span>
                        <span className={styles.text131}>
                          {' '}
                          1200 TND every 
                        </span>
                        <br></br>
                        <span className={styles.text133}>
                          month while moving
                          <span dangerouslySetInnerHTML={{ __html: ' ' }} />
                        </span>
                        <span className={styles.text134}>
                          toward cleaner,
                        </span>
                        <span> smarter energy.</span>
                        <br></br>
                        <span>Take control of your energy. Power your future.</span>
                      </span>
                    </div>
                    
                    <div className={styles.margin15}>
                      <div className={styles.container109}>
                        {/* Updated button with navigation to Contact page */}
                        <Link href="/contact">
                          <Button className={styles.component13}>
                            Contact 
                          </Button>
                        </Link>

                        <div className={styles.container111}>
                          <span className={`${styles.text139} www.solaira.tnOutfitLight2`}>
                            or
                          </span>
                        </div>
                        
                        <div className={styles.container112}>
                          <div className={styles.container113}>
                            <span className={`${styles.text140} www.solaira.tnOutfitLight2`}>
                              Call us
                            </span>
                          </div>
                          <div className={styles.component211}>
                            <a href="tel:+21699999999" className={styles['phone-link']}>
                              <span className={`${styles.text141} www.solaira.tnOutfitLight2`}>
                                (+216) 99-999-999
                              </span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <TrustBadge
                      icon1=""
                      icon1Alt=""
                      text1Part1="Trusted by more t"
                      text1Part2="han 400 Clients"
                      dividerImage="https://play.teleporthq.io/static/svg/default-img.svg"
                      dividerAlt="VerticalDivider1377"
                      icon2=""
                      icon2Alt=""
                      text2Part1="Smartest home batter"
                      text2Part2="y in tunisia"
                      className={styles.container114}
                    />
                  </div>
                  
                  <div className={styles.container117}>
                    <div className={styles.component310}>
                      <Lottie
                        animationData={solairaHouseAnimation}
                        loop={true}
                        className={styles['hero-image']}
                      />
                    </div>
                  </div>
                </div>
                
                <div className={styles.section2}>
                  <div className={styles.heading21}>
                    <span className={`${styles.text146} www.solaira.tnSemanticHeading22`}>
                      <span className={styles.text147}>
                        Why do I need a
                        <span dangerouslySetInnerHTML={{ __html: ' ' }} />
                      </span>
                      <span className={styles.text148}>
                        home battery
                      </span>
                      <span> system?</span>
                    </span>
                  </div>
                  
                  <div className={styles.container118}>
                    <div className={styles.container119}>
                      <span className={`${styles.text150} www.solaira.tnOutfitLight6`}>
                        <span>
                          Solaira is ready for everyone who wants to
                          take back control of their energy. Our smart
                          home battery protects you against
                        </span>
                        <br></br>
                        <span>
                          the phase-out of net metering, makes solar panels
                          even more profitable, and handles energy in a completely
                          autonomous way to
                        </span>
                        <br></br>
                        <span>
                          save you money at all times. Want to know more about
                          how our smart home battery buys and sells
                          energy? Read more
                        </span>
                        <br></br>
                        <span>below.</span>
                      </span>
                    </div>
                  </div>
                  
                  <FeaturesSection>
                    <FeatureCard
                      icon="⚡"
                      iconColor="#000000ff"
                      title="Real-Time Power Flow"
                      description="See exactly what's happening right now. Watch live as your solar panels generate clean energy, power your home, and feed excess back to the grid—all in one intuitive view."
                      image="https://plus.unsplash.com/premium_photo-1661559100329-409c3ef751b5?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    />
                    <FeatureCard
                      icon="📊"
                      iconColor="#e8d4f4"
                      title="Today's Performance at a Glance"
                      description="A complete summary of your day's energy story. Instantly understand your total solar production, home consumption, and net savings to see how well your system performed."
                      image="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop"
                    />
                    <FeatureCard
                      icon="🔆"
                      iconColor="#fef3c7"
                      title="Your System's Watchdog"
                      description="Sleep soundly knowing AI is monitoring your solar setup 24/7. Get instant alerts for any irregularities, inefficiencies, or drops in performance before they become bigger issues."
                      image="https://plus.unsplash.com/premium_photo-1682148219003-cf6ffbb22175?q=80&w=2034&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    />
                    <FeatureCard
                      icon="✨"
                      iconColor="#dbeafe"
                      title="Smart Savings, Powered by AI"
                      description="Receive personalized, actionable advice to maximize your solar investment. Our AI analyzes your unique data to suggest the best times to use appliances, charge batteries, and save more money."
                      image="https://images.unsplash.com/photo-1585347110442-1d1599db0db6?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    />
                  </FeaturesSection>
                  
                  <InfoSection
                    title="Claim your VAT refund on your home battery from"
                    highlightedTitle="Solaira"
                    description="It is now possible to reclaim the VAT on your home battery purchase. In collaboration with De Centrale, we handle this for all our customers."
                    buttonText="Read more"
                    buttonLink="/vat-refund"
                    image="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    logo="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    logoAlt="De Centrale"
                  />
                  
                  <SectionHeading 
                    text="What makes Solaira the"
                    highlightedText="best performing home battery"
                    subtitle="Discover how Solaira's innovative home batteries are revolutionizing sustainable energy storage"
                  />
                </div>
                
                <Footer
                  logoImage="https://play.teleporthq.io/static/svg/default-img.svg"
                  logoAlt="SVG6578a5b54fa1fa278cef6591footerlogosvgfill1657"
                  phone="(+216) 99-999-999"
                  email="info@solaira.tn"
                  address={
                    <>
                      <span>Centre Urbain Nord</span>
                      <br />
                      <span>676 CUN BP, Tunis 1080</span>
                    </>
                  }
                  aboutLinks={['Solar Panels', 'Home Battery', 'About Us', 'Blog', 'Product']}
                  supportLinks={['Contact', 'Privacy Policy', 'Terms of Service']}
                  connectLinks={['LinkedIn', 'Instagram', 'Facebook']}
                  copyrightText="2025 Solaira. All right reserved."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
};

export default HomePage
