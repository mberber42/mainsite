# Phase 2 visual evidence

The screenshots below cover all eight public page families in Turkish and English at desktop and mobile-responsive widths (32 captures total). The app was captured from the running Angular SSR build on 2026-10-07.

- **Desktop:** browser viewport 1265 × 624 CSS pixels.
- **Mobile:** the app runs in an actual **390 × 582 CSS-pixel iframe viewport**, so the app's mobile media queries and layout are active. The surrounding 1280 × 624 screenshot canvas is a temporary device frame used only for evidence capture; it is not an application route or tracked runtime feature.
- The mobile wrapper files were created only in ignored `dist/mainsite/browser/` and are not included in the source changes.
- Missing article/project and unknown-route captures show the localized 404 states.

| Page family                | Route used              | Desktop — TR                        | Desktop — EN                        | Mobile — TR                        | Mobile — EN                        |
| -------------------------- | ----------------------- | ----------------------------------- | ----------------------------------- | ---------------------------------- | ---------------------------------- |
| About                      | `/hakkimda`             | [PNG](./about-tr-desktop.png)       | [PNG](./about-en-desktop.png)       | [PNG](./about-tr-mobile.png)       | [PNG](./about-en-mobile.png)       |
| Services                   | `/hizmetler`            | [PNG](./services-tr-desktop.png)    | [PNG](./services-en-desktop.png)    | [PNG](./services-tr-mobile.png)    | [PNG](./services-en-mobile.png)    |
| Blog list                  | `/blog`                 | [PNG](./blog-list-tr-desktop.png)   | [PNG](./blog-list-en-desktop.png)   | [PNG](./blog-list-tr-mobile.png)   | [PNG](./blog-list-en-mobile.png)   |
| Blog detail — missing slug | `/blog/missing-entry`   | [PNG](./blog-detail-tr-desktop.png) | [PNG](./blog-detail-en-desktop.png) | [PNG](./blog-detail-tr-mobile.png) | [PNG](./blog-detail-en-mobile.png) |
| Lab list                   | `/lab`                  | [PNG](./lab-list-tr-desktop.png)    | [PNG](./lab-list-en-desktop.png)    | [PNG](./lab-list-tr-mobile.png)    | [PNG](./lab-list-en-mobile.png)    |
| Lab detail — missing slug  | `/lab/missing-project`  | [PNG](./lab-detail-tr-desktop.png)  | [PNG](./lab-detail-en-desktop.png)  | [PNG](./lab-detail-tr-mobile.png)  | [PNG](./lab-detail-en-mobile.png)  |
| Contact                    | `/iletisim`             | [PNG](./contact-tr-desktop.png)     | [PNG](./contact-en-desktop.png)     | [PNG](./contact-tr-mobile.png)     | [PNG](./contact-en-mobile.png)     |
| Not found                  | `/route-does-not-exist` | [PNG](./not-found-tr-desktop.png)   | [PNG](./not-found-en-desktop.png)   | [PNG](./not-found-tr-mobile.png)   | [PNG](./not-found-en-mobile.png)   |

The screenshot files are visual evidence only. They do not add personal profile claims, live social/CV destinations, form submission, or persisted content.
