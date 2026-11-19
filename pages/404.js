import React from 'react';
import Head from 'next/head';

import { useTranslations } from 'next-intl';

const NotFound = (props) => {
  return (
    <>
      <div className="not-found-container1">
        <Head>
          <title>404 - Not Found</title>
        </Head>
        <h3>OOPS! PAGE NOT FOUND</h3>
        <div className="not-found-container2">
          <h1 className="not-found-text2">404</h1>
        </div>
        <div className="not-found-container3">
          <h2 className="not-found-text3">
            WE ARE SORRY, BUT THE PAGE YOU REQUESTED WAS NOT FOUND
          </h2>
        </div>
      </div>
      <style jsx>
        {`
          .not-found-container1 {
            width: 100%;
            display: flex;
            overflow: hidden;
            min-height: 100vh;
            align-items: center;
            flex-direction: column;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
          }
          .not-found-container2 {
            display: flex;
            position: relative;
            align-items: center;
            flex-direction: column;
            justify-content: center;
            width: 100%;
          }
          .not-found-text2 {
            color: rgb(38, 38, 38);
            font-size: clamp(100px, 20vw, 252px);
            margin-top: -20px;
            font-weight: 900;
            margin-bottom: -20px;
            letter-spacing: clamp(-10px, -2vw, -20px);
            text-align: center;
          }
          .not-found-container3 {
            width: 100%;
            max-width: 421px;
            display: flex;
            align-items: center;
            flex-direction: column;
            justify-content: center;
            padding: 0 20px;
            box-sizing: border-box;
          }
          .not-found-text3 {
            text-align: center;
            font-weight: 400;
            font-size: clamp(16px, 4vw, 24px);
            line-height: 1.5;
          }
        `}
      </style>
    </>
  );
};

export default NotFound;
