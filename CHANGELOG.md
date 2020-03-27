<!-- --------------------------------------------------------------------------------------------------------------- -->

<!--Follow this format-->
<!--## [Version] - YYYY-MM-DD-->
<!--### Added/Improved/Fixed/Removed **ONLY** -->
<!--(-) Specifics-->

<!--OR-->

<!--## [Known Issues/Unreleased/Announcement] - Description/Date(YYYY-MM-DD)-->
<!--(-) Specifics-->

<!-- --------------------------------------------------------------------------------------------------------------- -->

<!--Versioning Guide-->
<!--ALL versions with SEVEN or FEWER entries: increase THIRD digit-->
<!--ALL versions with EIGHT or MORE entries: increase SECOND digit-->
<!--Increase FIRST digit when SECOND digit reaches NINE-->
<!--ALL updates within a day must be in the same version, unless separated by an announcement or stability-->

<!-- --------------------------------------------------------------------------------------------------------------- -->

<!-- Use the following HTML before information specific to beta users (e.g. The Announcement on 2020-03-12) -->
<!-- <a href="https://beta.graderoom.me/signup" target="_blank" style="color: #888888">[Beta Users]</a> -->

<!-- Use the following HTML to add lines under the date (e.g. PI Day on 2020-03-14) -->
<!-- <p style="font-weight: bold; margin: 0">[Text here]</p> -->

<!-- --------------------------------------------------------------------------------------------------------------- -->

## [Known Issues] - Working on it
- Point-based classes aren't synced with weights auto-population
- If you have an issue, send feedback in Settings > Feedback
- <a href="https://beta.graderoom.me/signup" target="_blank" style="color: #888888">[Beta Users]</a> If you have an issue, send feedback in Settings > About > Feedback Form

## [Unreleased] - Coming Soon
- Cumulative GPA Display
- Class insights
- Calculated weights of categories in point-based classes will be shown so that you can see how much effect a category has on your overall grade
- If you would like a feature to become implemented, send feedback in Settings > Feedback
- <a href="https://beta.graderoom.me/signup" target="_blank" style="color: #888888">[Beta Users]</a> If you would like a feature to become implement, send feedback in Settings > About > Feedback Form

## [Beta 1.8.1] - 2020-03-26
### Fixed
- Background color of class gain/loss on overview page
- What's new display correctly shows on new updates

## [Beta 1.8.0] - 2020-03-26
### Added
- Input validation when changing password or making a new account
- Confirmation for new password
- Last synced info on sync card
- Gain and loss per assignment in class tables
- Most recent gain or loss on overview page

### Improved
- Animation on input fields
- Graderoom refreshes automatically after a small delay when grades are updated
- Syncing grades defaults to GradeSync

### Fixed
- Color palette generator now works

### Removed
- Auto-refresh setting

## [Beta 1.7.0] - 2020-03-24
### Added
- What's New card
- Clicking on a class in the overview table opens the class page
- Keyboard shortcut 'W' to see the What's New page after it is closed

### Improved
- Random colors are now always easily distinguishable. Randomize your color palette in settings.
- Incorrect grade alerts are more clear and now also show on overview page
- Smoother animation when opening/closing cards
- Better changelog display

### Fixed
- Issue where changelog would sometimes show up behind another card
- All transitions were disabled after theme change without reload

### Removed
- Changelog no longer shows on login. You can still view the changelog through Settings > About > Changelog
- Removed keyboard shortcut for edit weights

## [Beta 1.6.1] - 2020-03-22
### Added
- Final grade calculator now supports all class types, including point-based classes

### Fixed
- Issue where missing weights would break final grade calculator

## [Beta 1.6.0] - 2020-03-21
### Added
- Terms and Conditions
- Privacy Policy
- Contact Us information in Settings > About
- Quick Links in About section of Settings
- Ability to allow remote access in settings (Denied by default)
- Support for non-academic classes
- Graderoom displays a message when calculated data does not match actual data in PowerSchool

### Fixed
- Auto theme is now set up correctly for new users
- Issue where excluded assignments were part of overall grade in point-based classes

## [Announcement] - 2020-03-20
- <a href="https://beta.graderoom.me/signup" target="_blank" style="color: #888888">[Beta Users]</a> During testing, some beta user's weights were lost. Although this data could be restored from the database backups, due to the beta nature of this issue and the relatively small inconvenience this will cause, this weight data will not be recovered
- <a href="https://beta.graderoom.me/signup" target="_blank" style="color: #888888">[Beta Users]</a> Send feedback if you have any questions, comments, or concerns

## [Beta 1.5.0] - 2020-03-20
### Added
- Semester GPA Display
- Ungraded assignments display in table and graph

### Improved
- Appearance fixes that improve screen usage on taller screen sizes (Mobile not supported)
- Crowd-sourced weights are now prioritized by when the user last synced grades to improve reliability
- Tooltip has been optimized for all possibilities to show only the most relevant information

### Fixed
- Issue where users would be autopopulated with weights from other teachers
- Issue where some weights that were no longer in user's grades would still be in weight table

### Removed
- Excluded assignments no longer display in graph

## [Beta 1.4.6] - 2020-03-18
### Improved
- Selecting point-based option prevents weight autopopulation

## [Beta 1.4.5] - 2020-03-17
### Added
- Added support for point-based classes
- Choose the point-based checkbox when editing weights to signify a point-based class
- Categories will still be displayed with your average in that category

## [Beta 1.4.4] - 2020-03-16
### Added
- Logging in from final grade calculator returns to final grade calculator after login

## [Beta 1.4.3] - 2020-03-15
### Added
- Class type information to database (AP/Honors) to make GPA calculation possible

### Improved
- Category Grades still show even with missing weights

### Fixed
- Issue where auto theme would sometimes not take effect

## [Beta 1.4.2] - 2020-03-14 <p style="font-weight: bold; margin: 0">Happy PI Day!</p>
### Improved
- Theme always remains the same after logout

### Fixed
- Auto Theme now works with Daylight Savings Time
- Issue for older users where animations between themes would not work

## [Beta 1.4.1] - 2020-03-13
### Improved
- User weight selection is overridden by admin selection to ensure fairness when comparing grades

### Fixed
- Loading message shows correctly when syncing grades
- Issue where changing weights for all users deleted their weights

## [Beta 1.4.0] - 2020-03-12
### Added
- Loading indicators to all messages to confirm that new information has been saved
- Messages default to blue while loading before switching to success or failure

### Improved
- Overview chart hard limits from 70% to 110% to enhance viewing experience
- View class charts to see grades outside those bounds
- More descriptive messages when sync grades fails

### Fixed
- Inputs deselect on apply to prevent unwanted changes after request is sent
- 'Escape' shortcut correctly disables when grades are syncing
- Weight auto-population works correctly for new and existing users

## [Announcement] - 2020-03-12
- Auto-population of weights is now in beta
- To prepare for the wide release, if you know the category weights for your classes, please enter them in the edit weights tab to improve the user experience for other users
- <a href="https://beta.graderoom.me/signup" target="_blank" style="color: #888888">[Beta Users]</a> If you find an issue with the auto-populated weights, send feedback in Settings > About > Feedback Form

## [Beta 1.3.2] - 2020-03-12
### Added
- Global analytics database
- Auto-population of weights for new and existing users

### Improved
- Weights Card Styling

### Fixed
- Issue where classes with multiple teachers were not supported
- Issue where user-removed weights would cause internal server error

## [Stable 1.3.1] - 2020-03-03
### Fixed
- Keyboard shortcuts are correctly disabled in all cases when typing into an input field

## [Stable 1.3.0] - 2020-03-02
### Added
- Brand new changelog display that, by default, displays once every 24 hours. This can be changed in settings
- The changelog will be updated anytime a new version (beta or stable) is released
- The version you are on will be highlighted green, and any announcements will be highlighted red
- The changelog can be accessed by going to Settings > Advanced > Changelog or with the keyboard shortcut 'Q'

### Improved
- Prevent background scroll when card is in view
- Changed close buttons to more accurately reflect their function

### Fixed
- Auto theme was not selectable without refresh in some cases
- Cards no longer close if initial click is inside card

## [Beta 1.2.3] - 2020-03-02
### Added
- Changelog scrolls to most recent announcement on open

### Fixed
- GradeSync loading screen now always shows correctly

## [Announcement] - 2020-03-02
- On March 2, 2020 at about 8 AM PST, Graderoom encountered a server error
- Unfortunately, all user accounts created after January 7, 2020 were lost
- Passwords and personal user data, however, were not compromised
- If your account still exists, you will be asked to sync your grades with PowerSchool to recover your data
- Please inform anyone affected by this issue to create a new account
- The Graderoom Team apologizes for the great inconvenience this has caused and has taken strict measures to prevent a similar event from occurring again
- <a href="https://beta.graderoom.me/signup" target="_blank" style="display: inline-block; color: #888888">[Beta Users]</a> Request another beta key by emailing graderoom@gmail.com or asking a developer directly

## [Beta 1.2.2] - 2020-03-02
### Added
- Announcements

### Improved
- 'Current Version' buttons only show up after a small amount of scrolling

### Fixed
- Keyboard shortcuts are now disabled while typing into the password/email fields in settings and when syncing grades

## [Beta 1.2.1] - 2020-03-01 <p style="font-weight: bold; margin: 0">It's March!</p>
### Added
- Changelog display initially scrolls to current version with a nice animation
- Added 'current version' buttons when changelog is scrolled

### Improved
- Better changelog UI
- Changed keyboard shortcut for changelog to 'Q'

## [Beta 1.2.0] - 2020-02-29 <p style="font-weight: bold; margin: 0">Happy Leap Day!</p>
### Added
- Separate changelog card to reduce clutter in settings
- Keyboard Shortcut 'C' to view changelog
- Stacked Cards possible with keyboard shortcuts

### Improved
- Changelog updates whenever it is opened
- Increased viewable space on changelog
- Changed close buttons to more closely reflect their purpose

### Fixed
- Auto theme would not be selectable in some cases without refresh
- Changelog message no longer shows if changelog opened manually
- Cards no longer close if initial click is inside card

## [Beta 1.1.0] - 2020-02-28
### Added
- Brand new changelog display
- Changelog now displays on login
- Current version highlighted in green
- New changelog message to help user understand how to disable changelog
- Changelog shows only once a day by default (can be changed in settings)

### Improved
- New changelog UI
- Prevent background scroll when focused on card

### Fixed
- Solved server crashing caused by changelog
- Alert settings correctly display previously saved settings
- Auto theme bounds now clear correctly on apply

## [Stable 1.0.0] - 2020-02-27
### Added
- GradeSync (Sync with PowerSchool on login)
- Proper Light Theme
- Automatic Theme option
- Satisfying transition when theme changes

### Improved
- User Interface/User Experience
- Updated chart tooltips to show assignment category and exclusion

### Fixed
- Significantly decreased lag on initial load of overview page
- Solved issue where new users could not sync with PowerSchool

### Removed
- Removed beta key requirement