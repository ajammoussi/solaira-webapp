# Component Refactoring Summary

## Overview
This document summarizes the reusable components created from the TeleportHQ-imported Next.js project. All components have been extracted from `pages/index.js` and placed in the `components/` directory.

## Created Components

### 1. **Button** (`components/Button/`)
A reusable button component used throughout the site for Contact buttons and other CTA elements.

**Props:**
- `text` (string, required): Button text
- `backgroundImage1` (string, optional): First background image URL
- `backgroundImage2` (string, optional): Second background image URL
- `altText1` (string, optional): Alt text for first background image
- `altText2` (string, optional): Alt text for second background image
- `className` (string, optional): Additional CSS classes
- `onClick` (function, optional): Click handler

**Usage Example:**
```jsx
<Button
  text="Contact"
  backgroundImage1="https://play.teleporthq.io/static/svg/default-img.svg"
  backgroundImage2="https://play.teleporthq.io/static/svg/default-img.svg"
  altText1="BackgroundI165"
  altText2="BackgroundI165"
/>
```

---

### 2. **Header** (`components/Header/`)
The main site header containing the top banner with contact info, logo, navigation menu, and contact button.

**Props:**
- `email` (string, required): Email address displayed in top banner
- `phone` (string, required): Phone number displayed in top banner
- `logoImage` (string, required): Logo image URL
- `logoAlt` (string, required): Alt text for logo
- `navItems` (array, required): Array of navigation item labels (e.g., `['Thuisbatterij', 'Zonnepanelen', 'Over ons', 'Blog', 'Contact']`)
- `contactButtonText` (string, default: 'Contact'): Text for the contact button in header
- `contactButtonBackground1` (string, optional): First background image for contact button
- `contactButtonBackground2` (string, optional): Second background image for contact button
- `contactButtonAlt1` (string, optional): Alt text for first contact button background
- `contactButtonAlt2` (string, optional): Alt text for second contact button background

**Usage Example:**
```jsx
<Header
  email="Info@solaira.tn"
  phone="(+216) 99-999-999"
  logoImage="https://play.teleporthq.io/static/svg/default-img.svg"
  logoAlt="SVG6578a5b54fa1fa278cef6591footerlogosvgfill1666"
  navItems={['Thuisbatterij', 'Zonnepanelen', 'Over ons', 'Blog', 'Contact']}
  contactButtonText="Contact"
  contactButtonBackground1="https://play.teleporthq.io/static/svg/default-img.svg"
  contactButtonBackground2="https://play.teleporthq.io/static/svg/default-img.svg"
  contactButtonAlt1="BackgroundI166"
  contactButtonAlt2="BackgroundI166"
/>
```

---

### 3. **TrustBadge** (`components/TrustBadge/`)
Displays trust indicators/badges with icons and text (e.g., "Vertrouwd door 400 Klanten", "Slimste thuisbatterij van Nederland").

**Props:**
- `icon1` (string, optional): URL or path for first icon (used as background image)
- `icon1Alt` (string, optional): Alt text for first icon
- `text1Part1` (string, required): First part of first badge text
- `text1Part2` (string, required): Second part of first badge text
- `dividerImage` (string, optional): Divider image URL between badges
- `dividerAlt` (string, optional): Alt text for divider
- `icon2` (string, optional): URL or path for second icon (used as background image)
- `icon2Alt` (string, optional): Alt text for second icon
- `text2Part1` (string, required): First part of second badge text
- `text2Part2` (string, required): Second part of second badge text
- `className` (string, optional): Additional CSS classes

**Usage Example:**
```jsx
<TrustBadge
  icon1=""
  icon1Alt=""
  text1Part1="Vertrouwd door"
  text1Part2="400 Klanten"
  dividerImage="https://play.teleporthq.io/static/svg/default-img.svg"
  dividerAlt="VerticalDivider1377"
  icon2=""
  icon2Alt=""
  text2Part1="Slimste thuisbatterij"
  text2Part2="van Nederland"
  className="frame1920wlight-container114"
/>
```

---

### 4. **Footer** (`components/Footer/`)
The site footer with logo, contact information, navigation links, and copyright information.

**Props:**
- `logoImage` (string, required): Footer logo image URL
- `logoAlt` (string, required): Alt text for footer logo
- `phone` (string, required): Phone number
- `email` (string, required): Email address
- `address` (string | JSX, required): Address text (can be JSX for line breaks)
- `aboutLinks` (array, required): Array of "About" section links
- `supportLinks` (array, required): Array of "Support" section links
- `connectLinks` (array, required): Array of "Connect" section links
- `copyrightText` (string, required): Copyright text
- `designedByText` (string, required): "Designed by" text
- `designerName` (string, required): Designer name

**Usage Example:**
```jsx
<Footer
  logoImage="https://play.teleporthq.io/static/svg/default-img.svg"
  logoAlt="SVG6578a5b54fa1fa278cef6591footerlogosvgfill1657"
  phone="(+216) 99-999-999"
  email="info@solaira.tn"
  address={
    <>
      <span>Hogebrinkerweg 14m</span>
      <br />
      <span>3871 KM, Hoevelaken</span>
    </>
  }
  aboutLinks={['Zonnepanelen', 'Thuisbatterij', 'Over ons', 'Blog', 'Product']}
  supportLinks={['Contact', 'Privacy Policy', 'Terms of Service']}
  connectLinks={['LinkedIn', 'Instagram', 'Facebook']}
  copyrightText="2025 Solaira Energy. All right reserved."
  designedByText="designed by "
  designerName="yassine"
/>
```

---

### 5. **CookieBanner** (`components/CookieBanner/`)
Cookie consent banner displayed at the bottom of the page.

**Props:**
- `title` (string, required): Banner title
- `description` (string, required): Description text (use `\n` for line breaks)
- `privacyPolicyText` (string, optional): Privacy policy link text
- `privacyPolicyLink` (string, optional): Privacy policy link URL
- `closeIcon` (string, required): Close icon image URL
- `closeIconAlt` (string, required): Alt text for close icon
- `acceptButtonText` (string, required): Accept button text
- `acceptButtonBackground1` (string, optional): First background image for accept button
- `acceptButtonBackground2` (string, optional): Second background image for accept button
- `acceptButtonAlt1` (string, optional): Alt text for first accept button background
- `acceptButtonAlt2` (string, optional): Alt text for second accept button background
- `onClose` (function, optional): Handler for close button click
- `onAccept` (function, optional): Handler for accept button click

**Usage Example:**
```jsx
<CookieBanner
  title="Wij gebruiken cookies"
  description="Onze website gebruikt cookies. Door verder te navigeren, gaan we ervan uit dat u toestemming geeft\nvoor het gebruik van cookies zoals beschreven in onze"
  privacyPolicyText="Privacy Policy."
  privacyPolicyLink="#"
  closeIcon="https://play.teleporthq.io/static/svg/default-img.svg"
  closeIconAlt="SVG6578a5b54fa1fa278cef65a6closecookiesvg1671"
  acceptButtonText="Contact"
  acceptButtonBackground1="https://play.teleporthq.io/static/svg/default-img.svg"
  acceptButtonBackground2="https://play.teleporthq.io/static/svg/default-img.svg"
  acceptButtonAlt1="BackgroundI167"
  acceptButtonAlt2="BackgroundI167"
  onClose={() => {}}
  onAccept={() => {}}
/>
```

---

## File Structure

```
components/
├── Button/
│   ├── index.js
│   └── styles.module.css
├── Header/
│   ├── index.js
│   └── styles.module.css
├── TrustBadge/
│   ├── index.js
│   └── styles.module.css
├── Footer/
│   ├── index.js
│   └── styles.module.css
└── CookieBanner/
    ├── index.js
    └── styles.module.css
```

---

## Implementation Status

### ✅ Completed
- All 5 components created with proper structure
- CSS modules created for each component
- Components exported as default
- Props extracted and made dynamic
- Accessibility attributes preserved (alt texts, etc.)
- Original classNames preserved where needed

### ⚠️ Partial Implementation
- `pages/index.js` has been partially updated to use the new components:
  - ✅ Imports added
  - ✅ Button components replaced (component12, component13)
  - ✅ Footer component replaced
  - ✅ CookieBanner component replaced
  - ⚠️ Header component replacement needs manual completion (due to file size complexity)
  - ⚠️ TrustBadge component replacement needs manual completion

### 📝 Remaining Work
1. **Header Component Integration**: The header section (lines ~25-102 in `pages/index.js`) still contains the original JSX. Replace it with the `<Header />` component using the props shown above.

2. **TrustBadge Component Integration**: The trust badge section (lines ~255-287 in `pages/index.js`) still contains the original JSX. Replace it with the `<TrustBadge />` component using the props shown above.

3. **Style Cleanup**: After all components are integrated, you may want to remove unused CSS from the `<style jsx>` block in `pages/index.js` that was specific to the replaced components. However, keep any global styles that are still needed.

---

## Example: Before/After for Button Component

### Before (Original JSX):
```jsx
<div className="frame1920wlight-component12">
  <div className="frame1920wlight-container106">
    <span className="frame1920wlight-text121 www.solaira.tnOutfitLight7">
      Contact
    </span>
  </div>
  <img
    src="https://play.teleporthq.io/static/svg/default-img.svg"
    alt="BackgroundI165"
    className="frame1920wlight-background14"
  />
  <img
    src="https://play.teleporthq.io/static/svg/default-img.svg"
    alt="BackgroundI165"
    className="frame1920wlight-background15"
  />
</div>
```

### After (Using Component):
```jsx
<Button
  text="Contact"
  backgroundImage1="https://play.teleporthq.io/static/svg/default-img.svg"
  backgroundImage2="https://play.teleporthq.io/static/svg/default-img.svg"
  altText1="BackgroundI165"
  altText2="BackgroundI165"
  className="frame1920wlight-component12"
/>
```

---

## Notes

1. **CSS Modules**: All components use CSS modules (`.module.css` files) to scope styles. The original classNames from TeleportHQ are preserved in the CSS modules where needed.

2. **TypeScript**: The project uses JavaScript (`.js` files), not TypeScript. If you want to add type safety later, you can convert these to `.tsx` files and add PropTypes or TypeScript interfaces.

3. **Styling**: The original inline styles and CSS classes from TeleportHQ are preserved. The CSS modules contain the extracted styles, but you may need to adjust them based on your actual design system.

4. **Accessibility**: All accessibility attributes (alt texts, etc.) have been preserved and made configurable via props.

5. **Data Attributes**: If your original code had `data-qa` or other data attributes from TeleportHQ, you may want to add those as props to the components.

---

## Next Steps

1. Complete the Header and TrustBadge component integration in `pages/index.js`
2. Test all components to ensure they render correctly
3. Remove unused CSS from the style block in `pages/index.js`
4. Consider adding PropTypes for runtime type checking
5. Optionally convert to TypeScript for better type safety

