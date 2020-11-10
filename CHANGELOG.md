<!-- --------------------------------------------------------------------------------------------------------------- -->
<!-- --------------------------------------------------------------------------------------------------------------- -->
<!-- ------------------------------------------- Format for Known Issues ------------------------------------------- -->
<!-- --------------------------------------------------------------------------------------------------------------- -->

<!-- ## [Known Issues] - Send bug reports in Settings > Help > Feedback Form -->
<!-- - Incorrect grade step calculation with ungraded assignments <strong>[Fixed in Beta X.X.X]</strong> -->


<!-- --------------------------------------------------------------------------------------------------------------- -->
<!-- ----------------------------------------- Format for Released Versions ---------------------------------------- -->
<!-- --------------------------------------------------------------------------------------------------------------- -->

<!-- ## [Stable/Beta X.X.X] - YYYY-MM-DD -->
<!-- ### Added/Improved/Fixed/Removed -->
<!-- - Specifics -->


<!-- --------------------------------------------------------------------------------------------------------------- -->
<!-- ---------------------------------------------- Versioning Guide ----------------------------------------------- -->
<!-- --------------------------------------------------------------------------------------------------------------- -->

<!-- ALL versions with SEVEN or FEWER entries: increase THIRD digit -->
<!-- ALL versions with EIGHT or MORE entries: increase SECOND digit -->
<!-- STABLE versions with LOTS of entries: increase FIRST digit -->
<!-- ALL updates within a day must be in the same version, unless separated by an announcement or stability -->


<!-- --------------------------------------------------------------------------------------------------------------- -->
<!-- ------------------------------------------------ Special HTML ------------------------------------------------- -->
<!-- --------------------------------------------------------------------------------------------------------------- -->

<!-- Use the following HTML before information specific to Beta -->
<!-- <em>[Beta]</em> -->

<!-- Use the following HTML before information specific to mobile users -->
<!-- <em>[Mobile]</em> -->


<!-- --------------------------------------------------------------------------------------------------------------- -->
<!-- --------------------------------------------------------------------------------------------------------------- -->

## [Known Issues] - <em>Send bug reports in More > Send Feedback</em><br><em>Only issues in the stable version will be listed here</em>
- Assignments from PowerSchool with the same due date are sometimes displayed in a different order than on PowerSchool
- [Beta] Summer semesters are listed under the incorrect year

## [Beta 3.3.8] - 2020-11-10
### Added
- Edits can now be saved to all assignments
- Sync Log can now also be accessed from the Sync card

### Improved
- Optimized load time for home page immediately after login
- Overview chart lines now return to normal immediately after the cursor leaves the chart

### Fixed
- Issue caused by credit courses and sync log

## [Beta 3.3.7] - 2020-11-06
### Added
- Clicking on any line on the overview chart now opens the page for that class
- Chart tooltips now display overall letter grade at every point
- Charts of classes with inaccurate weights now always display a final data point with the correct grade

### Improved
- Grades with incorrect weights now display thin, dashed lines on the chart to signify inaccurate weights

### Fixed
- Issue where refreshing or leaving the page after closing a half-complete feedback form would trigger an alert
- [Beta] Fixed several issues when viewing old semesters

### Removed
- Panning limit has been removed from charts

## [Beta 3.3.6] - 2020-11-02
### Fixed
- Letter grade lines not visible in light mode

## [Beta 3.3.5] - 2020-11-01
### Added
- Dashed lines at relevant letter grades on all charts

### Improved
- Sync Log now displays modifications to the names and categories of assignments
- Slightly increased manual syncing speed
- Sync Log is now always fully scrolled to top when opened

### Fixed
- Issue where sync log was preventing proper functioning of the site
- Issue where sync log would display score modification when score did not change

## [Beta 3.3.4] - 2020-10-27
### Improved
- Recent Changes display is now aptly called 'Sync Log'
- Sync Log has been compressed to display only relevant information
- Several styling improvements to Sync Log

### Fixed
- Issue where assignments that were modified more than once would show incorrect data in some parts of the Sync Log
- Issue where positive grade increases were not preceded by a '+'

## [Stable 3.3.3] - 2020-10-22
### Fixed
- Issue where spamming the sync grades button was possible

## [Stable 3.3.2] - 2020-10-20
### Fixed
- Issue caused by incorrect school password in GradeSync

## [Stable 3.3.1] - 2020-10-17
### Fixed
- Non-functional legend buttons in changelog display

## [Beta 3.3.0] - 2020-10-15
### Added
- Blur effects are now out of beta! Enable them in advanced appearance settings.
- [Beta] If you had blur effects enabled in the public beta, they will remain enabled.

### Improved
- Recent Changes now displays a detailed history
- Integrated overall grades into class navbar and increased size of overview graph
- Several browser-specific stability improvements
- Sizing of settings card
- [Beta] Several styling improvements to term switcher

### Fixed
- Issue where spamming the sync grades button was possible
- Several issues with Recent Changes
- Attempt to prevent keyboard shortcuts from firing when combined with special keys (Ctrl and/or Alt)
- [Beta] Issue where a portion of the screen could sometimes not be interacted with when blur effects were enabled

### Removed
- [Beta] Ability to tweak blur amount

## [Beta 3.2.1] - 2020-10-13
### Fixed
- Issue where users that hid non-academic classes could not view their grades

## [Beta 3.2.0] - 2020-10-10
### Added
- New 'Recent Changes' Card that displays all modifications, additions, and removals of assignments after each sync
- Keyboard shortcut 'G' for 'Recent Changes' Card
- New 'More' section to the main navbar
- [Beta] Message stating that old semesters are view-only. Edits will not be saved.

### Improved
- Tooltabs now react when a row is hovered to draw attention to their existence
- Keyboard shortcuts card displays correctly across more screen sizes
- Several smaller styling and smoothness improvements

### Fixed
- Issue with logged-in final grade calculator not working for users without grades
- [Beta] Issue where blur effects would not be applied to elements if interacted with immediately on page load
- [Beta] Issue with cumulative GPA in S2 of past years
- [Beta] Issue with 2019-2020 S1 Data showing -1 in the percent column

### Removed
- Quick Links section of Settings
- Some tutorial popups (More will be added in the future)

## [Stable 3.1.0] - 2020-10-02
### Added
- Descriptions to mass modification buttons
- [Beta] Added blur effect option and blur effect settings

### Improved
- Cumulative GPA now only includes past semesters
- Table sizing has improved
- Page no longer needs refresh when switching between weighted and unweighted GPAs
- Hovering over a tooltab brings it above any overlapping tooltabs

### Fixed
- Issue where assignment scores were too accurate by default
- Issue with cumulative GPA for students who had AP Calculus BC in 19-20 S2
- Issue with some classes incorrectly included in GPA calculation

### Removed
- Boundaries when zooming and panning graphs

## [Beta 3.0.6] - 2020-09-21
### Added
- [Beta] Added blur effect option and blur effect settings

## [Beta 3.0.5] - 2020-09-14
### Fixed
- Issue with some classes incorrectly included in GPA calculation

## [Stable 3.0.4] - 2020-09-14
### Improved
- [Beta] All beta features are enabled by default when a user joins the beta

### Fixed
- Issue where grades could not be manually synced
- [Beta] Issue where old data would not update correctly

## [Stable 3.0.3] - 2020-09-03
### Improved
- Made GPA Displays smaller and added theoretical maximums
- Moved weighted GPA toggle to homepage
- [Beta] New, less intrusive design for term switcher
- [Beta] Moved 'Leave Beta' button to Beta Settings

### Fixed
- Issue where new weights would not update automatically after sync
- Issue with password reset

## [Stable 3.0.2] - 2020-08-27
### Added
- GPA display now indicates if the displayed GPA is weighted or unweighted
- New public beta. Join by scrolling to the bottom of Account Settings
- First public beta feature: Enable viewing data from previous semesters

### Improved
- Graphs no longer hide data even if regularized

### Fixed
- Issue where weights for classes with some special characters could not be updated

## [Stable 3.0.1] - 2020-08-26
### Fixed
- Issue with syncing grades for some users
- Issue with syncing grades when some assignments were not graded in PowerSchool
- Issue where what's new page always showed at least 2 versions on the stable site
- Issue where users could not sign up on the stable site

## [Stable 3.0.0] - 2020-08-25
### Added
- Navigation Bar Updates<ul>
- Your name and graduation year show up under your username
- Added a help button
- Added syncing status in center navbar cluster
- Class navbar now remains on the top of the screen when scrolling down
- Clicking on your username now opens Account settings
- Clicking on the logo in the navbar now goes to the overview page if you are on a class page. If you are already on the overview page, the site will refresh. You can always use the logo to go to the homepage.
- Added new animation to sync button while syncing grades
- <em>[Mobile]</em> New "home" button</ul>
- Settings Updates<ul>
- Added Personal Info in Account Settings
- You can update your first name in settings
- Added progress status of tutorial
- Added button to reset tutorial progress
- See contributors to Graderoom in the 'About' tab of settings
- Updated 'About' tab with history and description
- Updated help messages on various settings
- Brand new color scheme presets in appearance settings
- Added advanced appearance settings<ul>
- Added setting for regularizing class graphs (enabled by default)
- Added setting for showing non-academic classes (enabled by default)
- Added setting for weighting GPA (enabled by default)</ul></ul>
- Class Table Updates<ul>
- All assignment categories, scores, and exclusions are now editable
- Added assignment wizard for adding assignments
- Added assignments save to your account
- Added a tool tab to every assignment row<ul>
- The undo button reverts any local changes to added assignments or edits to PowerSchool assignments
- The trash button deletes added assignments
- The save button saves and uploades modifications to added assignments
- The tool tab that displays at the top of category or overall tables can be used to enact the action on all rows in said table that support the action</ul>
- Added letter grades to assignment grades and overall grade steps
- Added sorting options<ul>
- Grades can be sorted from newest to oldest (enabled by default)
- Grades can also be sorted by category
- Sort methods save to your account</ul>
- Improved row coloring so that overall grade steps are always readable</ul>
- Miscellaneous Updates<ul>
- New types of popups
- Tutorial<ul>
- New tutorial and help messages
- Click the "Got It!" button on any tutorial popup to close it</ul>
- Support for Microsoft Edge (non-Chromium)
- <em>[Mobile]</em> Initial support for mobile website with limited features. Use Graderoom on your large screen device to access all features
- New custom scrollbars
- Added legend to the changelog with clickable elements
- New Keyboard shortcuts<ul>
- 'A' to add assignment
- 'H' to open the help tab of Settings</ul>
- Feedback form now autofills with your name
- Sync Grades Card and sync status now always show last synced information
- You can now request password reset from the signin page
- Added loading indicators to charts
- Added cumulative GPA display</ul>

### Improved
- User Interface Improvements<ul>
- Better popups
- Smoother, faster transition between themes
- Better spacing and styling on main navigation bar
- Improved Placement of popups
- Spacing in account settings has been improved so that content does not flow off screen
- Improved revert grade button placement
- Better display of excluded assignments
- Smoother animation on showing cards
- New styling of dropdowns globally
- Made grade deltas slightly larger
- Changelog Display style improvements
- Redesigned settings card
- Updated change password and school email sections in settings to match overall style
- Less important popups are now less intrusive and have a new icon
- Improved chart and weight table sizing
- Tweaked design of class tables
- Tweaked animations and styling in some areas
- Logged out pages, including sign-in are now themed based on time of day
- Generated colors are now always distinct
- <em>[Mobile]</em> Changelog is now sized correctly for mobile</ul>
- User Experience Improvements<ul>
- Better input validation on login and signup pages
- Decreased time before giving incorrect password feedback while attempting to sync grades
- Sync status is more accurate
- Disabled keyboard shortcuts while grades are manually syncing
- Focus incorrect password after manually syncing grades fails
- Popups with correct grade from PowerSchool now always show when calculated grade is incorrect
- Charts rerender when page is resized
- More informative sync status messages
- Whats New display now shows announcements
- Whats New display can display multiple missed versions
- Gradesync is more clear when enabled
- Class colors can be changed without refreshing the page
- Overview page now always shows on login, even if last page viewed before logout was different
- Incorrect grades no longer show in overview table
- Changelog now remains on last seen version when closed
- Stable versions are highlighted in blue
- Changelog initially only displays recent versions. More can be loaded by scrolling down.
- Improved support for Mozilla Firefox
- Page can be scrolled with card open
- Graphs are now bounded between 0 and 150 when panned and zoomed
- Terms and Conditions and Privacy Policy now must be scrolled to the bottom before accepting
- Syncing with PowerSchool no longer requires a refresh unless your classes change
- Graderoom now reacts much more quickly when PowerSchool is down
- Popups no longer remain open if the mouse quickly jumps from the initial position into the popup area
- Decreased load time when refreshing page while on first class page
- Charts change their x-axis to days if data fits within one month
- <em>[Mobile]</em> Homepage is much more useful and less cluttered. Click on a class to view its page
- <em>[Mobile]</em> Navbar now has important information such as sync status and user name easily visible
- <em>[Mobile]</em> Signup experience
- <em>[Mobile]</em> Weights and point-based toggle can now be edited on mobile
- <em>[Mobile]</em> Typing into inputs within cards has improved</ul>

### Fixed
- Incorrect grade step calculation with ungraded assignments
- Overview tab no longer shows until grades are successfully synced
- Issue where scores displayed incorrectly on popups
- Graderoom no longer automatically refreshes if you are focused on a card during syncing (except the sync grades card)
- Rounding errors with incorrect grade warning message
- Issue where main navigation bar toggle icon would sometimes disappear on theme change
- Unnecessary re-rendering
- Issues in weight tables when non-academic classes were hidden
- Issues in class tables when non-academic classes were hidden
- Issue where chart wouldn't change color on theme change
- Issue with unnecessary refreshing
- Issue where GradeSync could not be enabled when grades were locked in PowerSchool
- Issue where categories would not reset when the row was reset
- Issue where some icons incorrectly appeared above cards
- Issue where what's new card wouldn't show if grade syncing was unsuccessful
- Issue where card animations would last very long if keyboard shortcuts were spammed
- Issue where cards could sometimes not be closed with keyboard shortcuts
- Issue where changelog display buttons would work incorrectly after page resize
- Issue where popups would show over first card
- Issue where ungraded first assignment in any class would cause incorrect grade step calculation
- Issue where grades sometimes did not sync when autofill was enabled and GradeSync was disabled
- Issue where category grade steps were sometimes incorrect
- Issue where username in navbar was not centered
- Issue where popups were sometimes not perfectly aligned
- Issue where extra credit would sometimes have fake score
- Username in the final grade calculator page navbar is now vertically centered
- Issue with setting auto dark theme start to 12 AM
- Issue where auto dark theme bounds settings wouldn't show if automatic theme was already selected
- Bug when only one assignment was not excluded
- Prevented weights form from being submitted before page is fully loaded
- Issue where charts would not render properly in light mode
- Issue where popups were showing up underneath other elements
- Issue where page would sometimes say changes not saved
- <em>[Mobile]</em> Issue where scrolling was not smooth on some devices
- <em>[Mobile]</em> Issue where scrolling would not disable correctly

### Removed
- Alerts have been replaced by a more intuitive syncing status display
- 'Home' button from navbar everywhere (Use the logo to go home)
- Removed 'scroll to version' buttons in changelog
- <em>[Mobile]</em> Removed all charts

## [Beta 2.8.0] - 2020-08-24
### Added
- New assignment toolbar with save and trash options
- Added ability to save and undo changes to added assignments
- Added loading indicators to charts
- Added ability to regularize class graphs
- Added ability to delete, save, and trash all possible in a category or in the entire class
- Added ability to toggle weighted GPA
- Added cumulative GPA
- Added new animation while syncing to sync button icon
- Added advanced appearance settings

### Improved
- Popups no longer remain open if the mouse quickly jumps from the initial position into the popup area
- Decreased load time when refreshing page while on first class page
- Changed default date sort to Newest to Oldest
- Charts change their x-axis to days if data fits within one month
- Grades can by synced without refreshing the page in most cases

### Fixed
- Issue where assignments could not be edited
- Issues with editing assignments in category mode
- Issue where tutorial popups were not cleared correctly
- Issue where changelog legend buttons would not update if manually scrolled
- Bug when only one assignment was not excluded
- Prevented weights form from being submitted before page is fully loaded
- Visual bugs in homepage
- Issue where charts would not render properly in light mode
- Issue where popups were showing up underneath other elements
- Issue where page would sometimes say changes not saved

### Removed
- <em>[Mobile]</em> Tooltab is now hidden on mobile

## [Beta 2.7.6] - 2020-08-16
### Added
- Ability to request password reset from signin page

### Fixed
- Issue where page would sometimes not load

## [Beta 2.7.5] - 2020-08-10
### Added
- Added assignments now save to your account

## [Beta 2.7.4] - 2020-08-07
### Added
- When you add an assignment, the page is scrolled and the added assignment flashes briefly to draw attention to itself

### Fixed
- Issues with editing assignments when sorting from newest to oldest in category mode
- Unexclude buttons in light mode

## [Beta 2.7.3] - 2020-08-04
### Added
- Brand new color scheme presets you can choose from

### Improved
- Distinctness of generated colors
- Unexclude buttons now always display to make exclusion more clear

### Fixed
- Issue where class colors could not be changed
- Issue where saved sorting options were not displayed on load
- Issues with new accounts being unable to view the site

## [Beta 2.7.2] - 2020-07-30
### Improved
- Graderoom now reacts much more quickly when PowerSchool is down
- Readability of some popups in dark mode

### Fixed
- Issue where some assignment percents showed as -1 instead of being empty

## [Beta 2.7.1] - 2020-07-29
### Fixed
- Issue where sync status would constantly be "Syncing..."
- Issue with setting auto dark theme start to 12 AM
- Issue where auto dark theme bounds settings wouldn't show if automatic theme was already selected

## [Beta 2.7.0] - 2020-07-28
### Added
- Changelog legend now contains clickable elements
- New keyboard shortcut 'H' to open the help tab of Settings
- Sort methods are now synced and save automatically
- More tutorial popups
- Sync Grades Card and sync status now always show last synced information

### Improved
- Graphs are now bounded between 0 and 150 when panned and zoomed
- Updated "Got It" buttons in tutorial popups to be more responsive.
- Terms and Conditions and Privacy Policy now must be scrolled to the bottom before accepting
- Syncing with PowerSchool no longer requires a refresh unless your classes change
- Tweaked animations and styling in some areas
- Logged out pages, including sign-in are now themed based on time of day

### Fixed
- Username in the final grade calculator page navbar is now vertically centered
- Issue where scrollbar would display when content was not scrollable

## [Beta 2.6.1] - 2020-07-02
### Added
- Feedback form now autofills with your name

### Improved
- Assignment wizard can be closed by clicking anywhere outside

### Fixed
- Issue where class link navbar would display over cards

## [Beta 2.6.0] - 2020-06-28
### Added
- Ability to add assignments
- New custom scrollbars
- Added legend to the changelog
- Clicking on the logo in the navbar now goes to the overview page if on main page
- Brought back row coloring now improved and always readable
- Keyboard shortcut 'A' to add assignment
- Enabled ability to edit assignment categories while sorting by category
- Enabled ability to sort from newest to oldest while sorting by category

### Improved
- Less important popups are now less intrusive and have a new icon
- Changelog now remains on last seen version when closed
- Stable versions are highlighted in blue
- Changelog initially only displays recent versions. More can be loaded by scrolling down.
- Chart and weight table sizing
- Improved support for Mozilla Firefox
- Page can be scrolled with card open
- Tweaked design of class tables
- <em>[Mobile]</em> Signup experience
- <em>[Mobile]</em> Weights and point-based toggle can now be edited on mobile
- <em>[Mobile]</em> Styling for 'Home' button
- <em>[Mobile]</em> Changelog is now sized correctly for mobile
- <em>[Mobile]</em> 'Home' button now hides when typing into an input field
- <em>[Mobile]</em> Typing into inputs within cards has improved

### Fixed
- Issue where username in navbar was not centered
- Issue where popups were sometimes not perfectly aligned
- Issue where changing class colors was not working correctly
- Issue with sync status when card open after background sync complete
- Issue where extra credit would sometimes have fake score
- A number of issues in category sorting mode caused by special assignments
- <em>[Mobile]</em> Issue where scrolling was not smooth on some devices
- <em>[Mobile]</em> Issue where scrolling would not disable correctly

### Removed
- 'Home' button from navbar everywhere (Use the logo to go home)
- Removed 'scroll to version' buttons in changelog
- <em>[Mobile]</em> Removed large screen Popup Message

## [Beta 2.5.2] - 2020-06-12
### Added
- <em>[Mobile]</em> New "home" button

### Improved
- Incorrect grades no longer show in overview table
- <em>[Mobile]</em> Homepage is much more useful and less cluttered. Click on a class to view its page
- <em>[Mobile]</em> Navbar now has important information such as sync status and user name easily visible

### Removed
- <em>[Mobile]</em> Removed all charts

## [Beta 2.5.1] - 2020-06-11
### Added
- Initial support for mobile website with limited features. Use Graderoom on your large screen device to access all features.

### Improved
- Changes caused by resize now only occur when window resizing is complete
- Updated UI for tutorial progress bar
- Fixed tutorial popups and progress bar styling in dark mode

### Fixed
- All cards now display over all page elements

## [Beta 2.5.0] - 2020-06-10
### Added
- You can now click the "Got It!" button on any tutorial popup to close it
- Brought back 'About' section, now with a history and description
- Updated help messages on various settings

### Improved
- Class colors can be changed without refreshing the page
- Tutorial progress is now in the form of a progressbar
- Overview page now always shows on login, even if last page viewed before logout was different
- Better visibility of popups in dark mode
- Exclude toggle now shows on hover of any row, not just the assignment name
- Updated change password and school email sections in settings to match overall style
- Minor stability improvements

### Fixed
- Help button in main navigation bar links to correct page
- Issue where grades sometimes did not sync when autofill was enabled and GradeSync was disabled
- Issue where category grade steps were sometimes incorrect
- Minor bug fixes

### Removed
- Popups no longer disappear on mouseover

## [Beta 2.4.0] - 2020-06-04
### Added
- Ability to sort grades by category
- Completion status of tutorial
- Button to reset tutorial
- See contributors to this site in the Help Tab of settings

### Improved
- Responsiveness when editing grades
- Positioning of some popups
- Popups now disappear when hovered over to show what's behind them
- Redesigned settings
- Sync status display size

### Fixed
- Issue where what's new display showed versions that were already seen
- Issue where popups would show over first card
- Issue where ungraded first assignment in any class would cause incorrect grade step calculation

## [Beta 2.3.10] - 2020-06-01
### Added
- New tutorial and help messages

### Improved
- Gradesync is more clear when enabled
- Last synced display only show when recently synced

### Fixed
- Squashed several small bugs

## [Stable 2.3.9] - 2020-06-01
### Added
- Custom error pages when server is down

## [Beta 2.3.8] - 2020-05-30
### Improved
- Whats New display now shows announcements
- Whats New display can display multiple missed versions

### Fixed
- Issue where card animations would last very long if keyboard shortcuts were spammed
- Issue where cards could sometimes not be closed with keyboard shortcuts
- Issue where changelog display buttons would work incorrectly after page resize

## [Announcement 2.3.7] - 2020-05-29
- Our Privacy Policy has been updated
- Our Terms and Conditions have been updated

## [Beta 2.3.6] - 2020-05-28
### Improved
- Changelog Display

## [Beta 2.3.5] - 2020-05-27
### Added
- Support for Microsoft Edge (non-Chromium)

### Improved
- Support for Firefox

### Fixed
- Issue where some cards incorrectly show over other cards
- Issue where some icons incorrectly appeared above cards
- Issue where what's new card wouldn't show if grade syncing was unsuccessful

## [Beta 2.3.4] - 2020-05-26
### Added
- Ability to display class grades from newest to oldest

### Improved
- Exclusion toggle now shows only when hovering on assignment name
- Made grade deltas slightly larger

### Fixed
- Issue where categories would not reset when the row was reset
- Issue where theme change wouldn't animate

## [Beta 2.3.3] - 2020-05-24
### Improved
- Improved dropdown styling in dark mode
- More informative sync status messages
- Improved dropdown styling on excluded assignments

### Fixed
- Issue where GradeSync could not be enabled when grades were locked in PowerSchool

## [Beta 2.3.2] - 2020-05-20
### Added
- Ability to edit categories of assignments

### Improved
- Animation on showing cards
- Styling of dropdowns globally

### Fixed
- Issues with sticky navbar on resize
- Issue with unnecessary refreshing

## [Stable 2.3.1] - 2020-05-20
### Fixed
- Issue where existence of unpublished scores in PowerSchool prevented grades from syncing

## [Beta 2.3.0] - 2020-05-19
### Added
- Flags column in class data table
- Made assignment exclusion toggleable
- Ability to revert all edited rows at once
- Letter grade to individual assignment grades and overall grade steps

### Improved
- Better display of excluded assignments
- Popups with correct grade from PowerSchool now always show when calculated grade is incorrect
- Improved revert grade button placement
- Charts rerender when page is resized

### Fixed
- Issues in editing grades in classes with excluded assignments
- Issues in weight tables when non-academic classes were hidden
- Issues in class tables when non-academic classes were hidden
- Issue where chart wouldn't change color on theme change

### Removed
- Removed background coloring on class tables

## [Beta 2.2.0] - 2020-05-16
### Added
- Ability to revert edited scores to original

### Improved
- Sync status is more accurate
- Disabled keyboard shortcuts while grades are manually syncing
- Effects of edited scores now occur much more quickly
- Focus incorrect password after manually syncing grades fails

### Fixed
- Issue where editing a row wouldn't change the subsequent rows
- Issue where main navigation bar toggle icon would sometimes disappear on theme change
- Issue where sync status would freeze after closing sync grades card
- Unnecessary re-rendering
- Issue where page would hang when attempting to manually sync grades

## [Beta 2.1.1] - 2020-05-13
### Improved
- Editing a score field no longer impacts other inputs

### Fixed
- Rounding errors with incorrect grade warning message

## [Beta 2.1.0] - 2020-05-08
### Added
- Added a dedicated help button to main navbar
- You can now change your first name in settings
- Your name and graduation year show up under your username in the top navigation bar
- Syncing Status is now on main navbar
- Class navbar now stays on screen when scrolling down
- New types of popups
- There is now a help button on the navbar to find useful information quickly
- Clicking on your username now opens account settings
- All non-excluded assignment scores are now editable including extra credit assignments

### Improved
- Smoother, faster transition between themes
- Better spacing and styling on main navbar
- Placement of popups
- Spacing in account settings has been improved so that content does not flow off screen
- Decreased time before giving incorrect password feedback while attempting to sync grades

### Fixed
- Overview tab no longer shows until grades are successfully synced
- Issue where scores displayed incorrectly on popups
- Issue with editing grades that continuously bound new listeners to inputs resulting in a poor user experience
- Warning with unparsable scores
- Updated some remaining popups to new system
- Graderoom no longer automatically refreshes if you are focused on a card during syncing (except the sync grades card)

### Removed
- Alerts have been replaced by a more intuitive syncing status display

## [Beta 2.0.3] - 2020-05-01
### Added
- Most assignment scores are now editable on class pages. See the effects of different scores on your overall grade!

### Fixed
- Issue with current version scroll up button in changelog display
- Issue where personal info disappeared after opening Settings multiple times

## [Beta 2.0.2] - 2020-04-24
### Added
- Personal Info in Account Settings

### Improved
- Better popups
- Input validation on login and signup pages

## [Beta 2.0.1] - 2020-04-08
### Fixed
- Incorrect grade step calculation with ungraded assignments

## [Stable 2.0.0] - 2020-04-01
### Added
- Support for point-based classes
- Support for non-academic classes
- Support for decimal weights
- Ability to pan and zoom all charts
- Crowd-sourced weight population
- Weights can be edited from main page
- Help tab in settings
- Quick Links
- What's New Card that displays after every significant update
- Alerts any time calculated grades don't match grades in PowerSchool
- Input validation when changing password or making a new account
- Last synced info on sync card
- Gain and loss per assignment in class tables
- Most recent gain or loss on overview page
- Terms and Conditions
- Privacy Policy
- Ability to allow remote access in settings (Denied by default)
- Logging in from final grade calculator returns to final grade calculator after login
- Semester GPA Display
- Clicking on a class in the overview table opens the class page
- Ungraded assignments display in table and graph
- Final grade calculator now supports all class types, including point-based classes
- Loading indicators to all messages to confirm that new information has been saved
- Added help tab to settings
- Added scroll to announcement buttons in changelog
- Redirect to login on session timeout
- Revert to default button on weights table
- Message and strikethrough when weights are ignored

### Improved
- More intuitive UI
- Overview table has hard limits on y-axis from 70% to 110%
- More descriptive messages when sync grades fails
- All checkboxes are sliders
- Editing weights no longer requires refresh
- Grades show without inputted weights
- Animation on input fields
- Graderoom refreshes automatically after a small delay when grades are updated
- Syncing grades defaults to GradeSync
- Random colors are now always easily distinguishable. Randomize your color palette in settings.
- Smoother animation when opening/closing cards
- Better changelog display
- Appearance fixes that improve screen usage on taller screen sizes (Mobile not supported)
- Tooltip has been optimized to show only the most relevant information
- Better blurred background behind cards

### Fixed
- Inputs deselect on apply to prevent unwanted changes after request is sent
- 'Escape' shortcut correctly disables when grades are syncing
- Issue where auto theme would sometimes not take effect
- Issue where some weights that were no longer in user's grades would still be in weight table
- Auto theme is now set up correctly for new users
- Issue where changelog would sometimes show up behind another card
- Issue where all transitions were disabled after theme change without refresh
- Issue where missing weights would break final grade calculator
- Chart issues
- Class table appearance
- Arrow key shortcuts only enable on main page and settings page
- Issue where chart update would slow down after several page changes
- Issue where chart would switch between light and dark mode randomly
- Issues with arrow key shortcuts

### Removed
- Edit Weights Card
- Auto-refresh setting
- Changelog no longer shows on login. You can still view the changelog through Settings > Help > Changelog
- Removed keyboard shortcut for edit weights
- Excluded assignments no longer display in graph

## [Beta 1.9.4] - 2020-04-01
### Added
- Redirect to login on session timeout
- Revert to default button on weights table
- Message and strikethrough when weights are ignored

### Fixed
- Issues with arrow key shortcuts
- Issue with changelog display
- Issue where refreshing from first class would show overview page

## [Beta 1.9.3] - 2020-03-31
### Added
- Ability to pan and zoom all charts
- Added scroll to announcement buttons in changelog
- Support for decimal weights

### Improved
- Slider styling
- Better blurred background behind cards

### Fixed
- Theme issues
- Point-based weight calculation

## [Beta 1.9.2] - 2020-03-30
### Added
- Keyboard shortcuts card

### Improved
- Changed About tab to Help tab

### Fixed
- Class table appearance
- Arrow key shortcuts only enable on main page and settings page

## [Beta 1.9.1] - 2020-03-29
### Added
- Incorrect GPA message

### Improved
- Weights save when click outside input
- All checkboxes are sliders

### Fixed
- Chart issues
- Site remains on page after refresh
- Broken auto theme settings
- Missing weights show up red

## [Beta 1.9.0] - 2020-03-28
### Added
- New way to edit weights from class page
- New slider control for point based option
- Calculated weights are shown for point-based classes

### Improved
- Grades show without inputted weights
- Incorrect grade messages are more intuitively and unobstructively placed
- Editing weights no longer requires refresh

### Fixed
- Issue where chart update would slow down after several page changes
- Issue where chart would switch between light and dark mode randomly

### Removed
- Edit Weights Card

## [Beta 1.8.1] - 2020-03-26
### Fixed
- Background color of class gain/loss on overview page
- What's new display correctly shows on new updates
- Sizing issue for sync grades card

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

## [Announcement 1.5.1] - 2020-03-20
- <em>[Beta]</em> During testing, some beta user's weights were lost. Although this data could be restored from the database backups, due to the beta nature of this issue and the relatively small inconvenience this will cause, this weight data will not be recovered
- <em>[Beta]</em> Send feedback if you have any questions, comments, or concerns

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

## [Beta 1.4.2] - 2020-03-14
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

## [Announcement 1.3.3] - 2020-03-12
- Auto-population of weights is now in beta
- To prepare for the wide release, if you know the category weights for your classes, please enter them in the edit weights tab to improve the user experience for other users
- <em>[Beta]</em> If you find an issue with the auto-populated weights, send feedback in Settings > About > Feedback Form

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

## [Beta 1.2.4] - 2020-03-02
### Added
- Changelog scrolls to most recent announcement on open

### Fixed
- GradeSync loading screen now always shows correctly

## [Announcement 1.2.3] - 2020-03-02
- On March 2, 2020 at about 8 AM PST, Graderoom encountered a server error
- Unfortunately, all user accounts created after January 7, 2020 were lost
- Passwords and personal user data, however, were not compromised
- If your account still exists, you will be asked to sync your grades with PowerSchool to recover your data
- Please inform anyone affected by this issue to create a new account
- The Graderoom Team apologizes for the great inconvenience this has caused and has taken strict measures to prevent a similar event from occurring again
- <em>[Beta]</em> Request another beta key by emailing graderoom@gmail.com or asking a developer directly

## [Beta 1.2.2] - 2020-03-02
### Added
- Announcements

### Improved
- 'Current Version' buttons only show up after a small amount of scrolling

### Fixed
- Keyboard shortcuts are now disabled while typing into the password/email fields in settings and when syncing grades

## [Beta 1.2.1] - 2020-03-01
### Added
- Changelog display initially scrolls to current version with a nice animation
- Added 'current version' buttons when changelog is scrolled

### Improved
- Better changelog UI
- Changed keyboard shortcut for changelog to 'Q'

## [Beta 1.2.0] - 2020-02-29
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
- Removed beta key requirement for stable site
