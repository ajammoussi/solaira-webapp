import React from 'react'
import styles from './styles.module.css'

const TrustBadge = ({
  icon1,
  icon1Alt,
  text1Part1,
  text1Part2,
  dividerImage,
  dividerAlt,
  icon2,
  icon2Alt,
  text2Part1,
  text2Part2,
  className,
}) => {
  return (
    <div className={`${styles.container114} ${className || ''}`}>
      <div className={styles.container115}>
        {icon1 && <div className={styles.img1} style={{ backgroundImage: `url(${icon1})` }}></div>}
        <div className={styles.margin16}>
          <div className={styles.paragraph1}>
            <span className={styles.text142}>{text1Part1}</span>
            <span className={styles.text143}>{text1Part2}</span>
          </div>
        </div>
      </div>
      {dividerImage && (
        <img
          src={dividerImage}
          alt={dividerAlt}
          className={styles.verticalDivider}
        />
      )}
      <div className={styles.container116}>
        {icon2 && <div className={styles.trophy} style={{ backgroundImage: `url(${icon2})` }}></div>}
        <div className={styles.margin17}>
          <div className={styles.paragraph2}>
            <span className={styles.text144}>{text2Part1}</span>
            <span className={styles.text145}>{text2Part2}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrustBadge

