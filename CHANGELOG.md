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

<!-- Use the following HTML before information specific to Experiments -->
<!-- <em>[Experiment]</em> -->

<!-- Use the following HTML before information specific to mobile users -->
<!-- <em>[Mobile]</em> -->

<!-- Use the following HTML before information specific to API users -->
<!-- <em>[API]</em> -->

<!-- Use `` around text to make it monospace -->

<!-- Use <github issue="[num]">[description]</github> to link a github issue -->

<!-- DO NOT USE THE "|" CHARACTER ANYWHERE -->

<!-- --------------------------------------------------------------------------------------------------------------- -->
<!-- --------------------------------------------------------------------------------------------------------------- -->

## [Known Issues] - <em>Send bug reports in More > Send Feedback</em><br><em>Only issues in the stable version will be listed here</em>
- None

## [Stable 6.3.2] - 2023-11-10
### Improved
- Lowered website load times by archiving old and unused accounts

## [Stable 6.3.1] - 2023-10-24
### Fixed
- PowerSchool lock detection

## [Beta 6.3.0] - 2023-10-15
### Added
- New assignment info popup<ul>
- <github issue="125">Add ability to see teacher comments</github>
- Ability to view assignment descriptions</ul>

### Improved
- Made grade deltas more readable
- Made assignment rows that don't change your grade dimmer (requested on Discord)
- "Add Assignment" popup now shows existing added categories as options

### Fixed
- <github issue="159">Category sort mode doesn't show added categories</github>
- Various visual bugs in category sorted tables
- <em>[Mobile]</em> Category sorted data now displays correctly on mobile

## [Stable 6.2.5] - 2023-10-14
### Improved
- No longer load Discord widget on page load

### Fixed
- <github issue="164">Grade is calculated wrong if the weight for a category is zero</github>
- Changelog notifications not clearing properly

## [Announcement 6.2.4] - 2023-08-25 - Had a Sync Error? ⬇️ Click here ⬇️
- Graderoom depends on PowerSchool functioning
- If PowerSchool doesn't work, Graderoom cannot work
- Please check if PowerSchool works before reporting any more issues to me
- <img src="/public/resources/PowerSchool-Down-08-25-23.png" style="width: 100%">

## [Stable 6.2.3] - 2023-08-25
### Improved
- More descriptive sync errors

## [Stable 6.2.2] - 2023-08-23
### Fixed
- Issue with adding weights when non-academic classes were hidden

## [Beta 6.2.1] - 2023-08-21
### Fixed
- Issue with adding weights when non-academic classes were hidden

## [Stable 6.2.0] - 2023-08-13 - New school year, new you!
### Added
- <github issue="128">Allow adding new categories when adding assignments</github>

### Improved
- Loosen criteria for weights being considered custom
- <github issue="133">Improve mobile site</github>
- Only the latest update becomes a notification
- Better contrast in Changelog
- Changelog loads much faster now
- Text field validation is now themed differently in light and dark mode

### Fixed
- Old semesters with no graded courses can now be accessed
- Issue where using the revert button added a category with the name "hasWeights"
- Issue where reset buttons would show for no reason
- Graduation chart not updating
- Latest change deltas in weights tables now work properly when PowerSchool is locked
- Issue where coral underlines wouldn't show under missing weights when point-based disabled
- <github issue="129">Overall grade displays as (False) when adding an assignment and no graded assignments exist</github>
- Issue where some inputs would not respond to 'Enter' keypress immediately after an assignment was added
- Issue where adding an assignment to an empty class would not clear the "No Data" text
- Fixed an issue where page would refresh unnecessarily after sync when showing non-academic classes was disabled
- Entered scores that result in negative assignment percentages no longer cause "false" assignment letter grades
- <github issue="124">Fix bcp scraper</github>
- Auto theme change not triggering correctly on all pages
- Auto theme change not updating all logos
- BISV email validation
- Ancient assignments (like back in my day) can now be edited

### Removed
- "What's New" Popup

## [Beta 6.1.1] - 2023-08-13
### Improved
- Loosen criteria for weights being considered custom

### Fixed
- Old semesters with no graded courses can now be accessed
- Issue where using the revert button added a category with the name "hasWeights"
- Issue where reset buttons would show for no reason

## [Beta 6.1.0] - 2023-08-12
### Added
- <github issue="128">Allow adding new categories when adding assignments</github>

### Improved
- <github issue="133">Improve mobile site</github>
- Only the latest update becomes a notification
- Better contrast in Changelog
- Changelog loads much faster now
- Text field validation is now themed differently in light and dark mode

### Fixed
- Graduation chart not updating
- Latest change deltas in weights tables now work properly when PowerSchool is locked
- Issue where coral underlines wouldn't show under missing weights when point-based disabled
- <github issue="129">Overall grade displays as (False) when adding an assignment and no graded assignments exist</github>
- Issue where some inputs would not respond to 'Enter' keypress immediately after an assignment was added
- Issue where adding an assignment to an empty class would not clear the "No Data" text
- Fixed an issue where page would refresh unnecessarily after sync when showing non-academic classes was disabled
- Entered scores that result in negative assignment percentages no longer cause "false" assignment letter grades
- <github issue="124">Fix bcp scraper</github>
- Auto theme change not triggering correctly on all pages
- Auto theme change not updating all logos
- BISV email validation
- Ancient assignments (like back in my day) can now be edited

### Removed
- "What's New" Popup

## [Stable 6.0.6] - 2023-05-23
### Fixed
- Fix locked PowerSchool sync
- <github issue="122">Top gets cut off in account making page</github>
- <github issue="123">Assignment Excluded by Teacher Cannot be Unexcluded if Score is Changed</github>

## [Announcement 6.0.5] - 2023-05-12 - <span class="changelog-inline-setoff" style="color:red">CLICK ON THIS. READ IT.</span>
- <span class="changelog-inline-setoff">TODAY, MAY 12, 2023</span>
- <span class="changelog-inline-setoff">The Developers are in front of Sobrato</span>
- <span class="changelog-inline-setoff">There will be Krispy Kreme</span>
- <span class="changelog-inline-setoff">Come talk to us</span>

## [Announcement 6.0.4] - 2023-05-03 - Graderoom Dev Meetup
- Fri, May 12th, lunch and after school, in front of Sobrato
- Come if you are interested in developing for Graderoom, have a feature request, want your weights verified, or just want to say hello.
- I will be bringing Krispy Kreme.
- -Bryce

## [Beta 6.0.3] - 2023-05-03
### Fixed
- <github issue="122">Top gets cut off in account making page</github>

## [Stable 6.0.2] - 2023-03-26
### Fixed
- Fix the fix for sync failing when an assignment is removed

## [Stable 6.0.1] - 2023-03-22
### Fixed
- Sync failing when an assignment is removed

## [Stable 6.0.0] - 2023-03-19 - We're open-source :)
### Added
- <span class="changelog-inline-setoff"><a href="https://github.com/graderoom/graderoom-website" target="_blank">Graderoom is now open-source</a></span>
- You can now use the up/down arrow keys to move between weight table fields
- Support for hyphenated names/emails
- Grades for BISV now split correctly for T3

### Improved
- Links in changelog display are more obviously links
- Class averages no longer take ungraded users into account
- Sync data only displays items from the current semester

### Fixed
- Issues related to hiding non-academic classes<ul>
- Colors mismatch
- Inability to add assignments to classes that you should be able to add assignments to</ul>
- Issue where clicking the open changelog buttons the second time wouldn't scroll to the correct version
- Issue where a teacher removing an assignment that you made edits to would cause the site to not load
- After resize, the changelog did not behave as expected

## [Beta 5.11.0] - 2023-03-18 - HI I'M BACK
### Added
- You can now use the up/down arrow keys to move between weight table fields
- Support for hyphenated names/emails
- Sync now includes teacher comments and assignment descriptions<ul>
- They aren't displayed yet</ul>
- Grades for BISV now split correctly for T3

### Improved
- Class averages no longer take ungraded users into account
- Sync data only displays items from the current semester

### Fixed
- Issues related to hiding non-academic classes<ul>
- Colors mismatch
- Inability to add assignments to classes that you should be able to add assignments to</ul>
- Issue where clicking the open changelog buttons the second time wouldn't scroll to the correct version
- Issue where a teacher removing an assignment that you made edits to would cause the site to not load
- After resize, the changelog did not behave as expected

## [Stable 5.10.0] - 2023-01-09 - Here we go again!
### Added
- Locked PowerSchool sync now works for users that have never synced before
- Implemented task queues to prevent race cases for live sync statuses. I hate JavaScript.
- All GPAs should now use calculated grades if PowerSchool is locked. They'll have a warning just so you know it's not necessarily accurate

### Improved
- If any errors ever occur, there are now unique error codes that you can provide to the developers to help with debugging
- In charts, tooltips on lines with unverified weights now include the data point value
- Locked scraper now also fetches empty courses
- Sync log will no longer show all assignments as new/removed when the number of courses changes
- Class colors now stay the same after hiding/unhiding non-academic classes
- Cura has been set as a non-academic class by default, as well as several Sports and Study Halls
- If a Bellarmine course has no grades and no set class type in the catalog, and a user has non-academic course display disabled, a message now appears asking them to send feedback about whether the class is non-academic or not

### Fixed
- Graderoom should no longer unnecessarily refresh when 'show non-academic courses' is disabled
- Issues with class colors when non-academic courses were hidden
- Errors related to it no longer being December<ul>
- Page wouldn't load if 'Show non-academic classes' was disabled
- Analytics wouldn't load</ul>
- Seasonal Effects can be disabled without refresh again
- Issue where 'Overview' button in class navbar had a smaller hitbox than it should have
- Issue where PowerSchool grades continued to show in incorrect grade messages if sync failed
- Grammar errors everywhere
- Sync issue caused by Bellarmine's misconfiguration of SSL certificates
- Sync Failure sync status is now the correct color
- Issue where clicking links in a certain order would prevent you from accessing the homepage without clearing cookies
- Discord verification now works for new users (since 12/21/2022)
- Grades are now sorted properly when they carry into the next year
- Class type text in Class Info no longer says BCP for schools that aren't BCP

### Removed
- Setting for showing empty classes

## [Beta 5.9.2] - 2023-01-09
### Fixed
- Graderoom should no longer unnecessarily refresh when 'show non-academic courses' is disabled
- Issues with class colors when non-academic courses were hidden

## [Beta 5.9.1] - 2023-01-08
### Fixed
- Discord verification now works for new users (since 12/21/2022)
- Grades are now sorted properly when they carry into the next year
- Class type text in Class Info no longer says BCP for schools that aren't BCP

## [Beta 5.9.0] - 2023-01-07 - Happy New Year!
### Added
- Locked PowerSchool sync now works for users that have never synced before
- Implemented task queues to prevent race cases for live sync statuses. I hate JavaScript.
- All GPAs should now use calculated grades if PowerSchool is locked. They'll have a warning just so you know it's not necessarily accurate

### Improved
- If any errors ever occur, there are now unique error codes that you can provide to the developers to help with debugging
- In charts, tooltips on lines with unverified weights now include the data point value
- Locked scraper now also fetches empty courses
- Sync log will no longer show all assignments as new/removed when the number of courses changes
- Class colors now stay the same after hiding/unhiding non-academic classes
- Cura has been set as a non-academic class by default, as well as several Sports and Study hHalls
- If a Bellarmine course has no grades and no set class type in the catalog, and a user has non-academic course display disabled, a message now appears asking them to send feedback about whether the class is non-academic or not

### Fixed
- Graderoom no longer refreshes unnecessarily when empty classes are hidden
- Errors related to it no longer being December<ul>
- Page wouldn't load if 'Show non-academic classes' was disabled
- Analytics wouldn't load</ul>
- Seasonal Effects can be disabled without refresh again
- Issue where 'Overview' button in class navbar had a smaller hitbox than it should have
- Issue where PowerSchool grades continued to show in incorrect grade messages if sync failed
- Grammar errors everywhere
- Sync issue caused by Bellarmine's misconfiguration of SSL certificates
- Sync Failure sync status is now the correct color
- Issue where clicking links in a certain order would prevent you from accessing the homepage without clearing cookies

### Removed
- Setting for showing empty classes

## [Announcement 5.8.3] - 2022-12-25 - Merry Christmas!
- You may see an error message that says 'Sync Failed' or 'Incorrect PowerSchool password'
- If you've successfully synced in the past, this is because Graderoom is unable to log in to PowerSchool using your password, but it's not your fault
- Students have reported that their PowerSchool logins have temporarily stopped working several times today.
- When PowerSchool stops working, Graderoom will not be able to sync either.
- Enjoy the rest of your break!

## [Stable 5.8.2] - 2022-12-23
### Added
- Loading animation to changelog

### Improved
- Analytics chart points enlarge without cursor intersect
- Changelog loads faster after first load

### Fixed
- Help button in 'More' menu now links to the correct place
- Letter grade in overview chart is now the calculated letter grade when PowerSchool is locked
- Issues with added/edited assignments not saving if hiding any classes
- Issue where editing an assignment and then unhiding classes caused the page to not load

## [Stable 5.8.1] - 2022-12-22 - You can clear these notifications by clicking the 'Open Changelog' button
### Improved
- Beta versions no longer show as notifications on stable site

### Fixed
- PowerSchool sync works again :)

## [Stable 5.8.0] - 2022-12-21 - You did great this semester!
### Added
- <span class="changelog-inline-setoff">Notification Panel</span><ul>
- No longer an experiment
- Added keyboard shortcut 'N' for Notification Panel
- Added Notification Panel settings<ul>
- Added option for how to show new versions. More coming soon.</ul>
- Added notification panel tutorial
- Notifications sync between devices
- Added notifications for Donation Thank You messages</ul>
- Navbar 'More' menu now shows when hovering on the 'More' text
- New animations throughout the site<ul>
- Added a 'Reduce Motion' toggle in 'Appearance' settings for those that might not want them</ul>
- All PowerSchool courses now sync to Graderoom, even if they have no grades<ul>
- Added a setting to enable viewing empty courses, enabled by default</ul>
- Added keyboard shortcuts for more than 9 classes using the '0', '-', and '=' keys
- <span class="changelog-inline-setoff">Discord Verificaton</span><ul>
- Join the Discord and type <span class="mono">/verify</span> to get started</ul>

### Improved
- Interacting with charts has gotten better! Guidelines no longer get in the way when an assignment is near your cursor.
- Updated language of 'General' settings to 'Appearance' settings since that's all they were
- Updated language of 'Beta Features' to 'Experiments' to differentiate from the beta site
- Those with inactive accounts no longer see errors with their grades
- Made Christmas Lights more efficient
- When taking an action that requires refreshing the page, Graderoom will now remain on the term/semester that you were on before making the request.
- Improved refresh-rate display and renamed it to 'Stats for Nerds'
- No longer hide Christmas lights when unfocus
- All pages should load slightly faster now
- Overview chart<ul>
- Tooltip moved below points for better visibility
- Now detects when the mouse is moved out and returns all chart lines to normal thickness
- Animates faster and fps should drop less if you decide to continuously move your mouse around inside it
- Thickness changes are more drastic to help see the whole line
- Clicks now only open assignment pages if your cursor intersects a point
- Supports when assignments from different classes have the same date and score and highlights both lines on hover</ul>
- Changelog doesn't load more times than it needs to
- Changelog legend now scrolls along with the changelog
- Tweaked snow color slightly and improved fps. You probably won't notice.
- Christmas Lights now have a top row on login/signup pages
- Changed default analytics chart zoom to 6 months and sped up some animations
- Analytics chart now allows panning the graph instead of drawing a box for zoom
- Older semesters that only have overall grades have better-looking overview charts now.
- Add assignment button is disabled when a class has no weights
- Class info button now always functions properly
- Point-based toggle has a normal hitbox now
- Added assignment animation
- Users now have only one socket per session for efficiency
- Your session should stay alive for longer if you load the page again
- Background page can no longer be scrolled while a card is displayed
- Choosing login/signup from charts or final grade calc and then logging in now returns you to the page you were previously on

### Fixed
- Several issues with adding/editing/removing/saving assignments
- Issue where some users' pages would not load
- Issue with analytics not refreshing daily
- Issue with snow and Christmas Lights not disabling when they should
- Blur Effects should work on Safari now
- Issue where blur color was wrong if a user had blur effects enabled while in light theme, turned them off, switched to dark system/sun/custom theme and then enabled blur effects
- Issue with a tutorial popup not showing up
- Issues with infinite redirects
- Issue where 'GradeSync Enabled' message would show when incorrect login details were entered
- Issue with calculation if a weighted category had 0/0 points.
- Credit/Empty classes no longer show in the overview chart
- Issue with CMD+# shortcuts being overridden by Graderoom on Mac
- Issue with overall grade calculation when empty category
- <em>[Mobile]</em> Issue with Donate shiny text in mobile site

### Removed
- Changelog Legend

## [Beta 5.7.1] - 2022-12-20
### Added
- <span class="changelog-inline-setoff">Notification Panel</span><ul>
- No longer an experiment</ul>

### Fixed
- Issue with overall grade calculation when empty category
- Issue with adding assignment wizard categories when empty course existed

## [Beta 5.7.0] - 2022-12-19
### Added
- Support for Trimester separation for BISV students
- Support for empty courses for BISV students
- Analytics now show number of users/sessions currently active
- Graderoomba Backend
- <em>[Experiment]</em> Notification Panel<ul>
- Pinned notifications are now actually pinned
- Notifications have more animations when pinning/unpinning/dismissing/undismissing
- Notification action buttons are larger
- Notification actions are way more efficient now
- Added notifications for Donation Thank You messages</ul>

### Improved
- Tweaked snow color slightly and improved fps. You probably won't notice.
- Christmas Lights now have a top row on login/signup pages
- Changed default analytics chart zoom to 6 months and sped up some animations
- Analytics chart now allows panning the graph instead of drawing a box for zoom
- Older semesters that only have overall grades have better-looking overview charts now.
- Add assignment button is disabled when a class has no weights
- Class info button now always functions properly
- Point-based toggle has a normal hitbox now
- Added assignment animation
- Users now have only one socket per session for efficiency
- Notification tutorial
- Your session should stay alive for longer if you load the page again
- Background page can no longer be scrolled while a card is displayed
- Choosing login/signup from charts or final grade calc and then logging in now returns you to the page you were previously on

### Fixed
- Issue where 'GradeSync Enabled' message would show when incorrect login details were entered
- Issue with calculation if a weighted category had 0/0 points.
- Credit/Empty classes no longer show in the overview chart
- Issue with exclude button not displaying in the 'Add Assignment' popup
- Issue with CMD+# shortcuts being overridden by Graderoom on Mac

## [Beta 5.6.0] - 2022-12-10
### Added
- <em>[Experiment]</em> Notification Panel<ul>
- Added keyboard shortcut 'N' for Notification Panel
- Added Notification Panel settings<ul>
- Added option for how to show new versions. More coming soon.</ul>
- Added notification panel tutorial
- Notifications now sync between devices</ul>
- Added keyboard shortcuts for more than 9 classes using the '0', '-', and '=' keys

### Improved
- No longer hide Christmas lights when unfocus
- All pages should load slightly faster now
- Overview chart<ul>
- Tooltip moved below points for better visibility
- Now detects when the mouse is moved out and returns all chart lines to normal thickness
- Animates faster and fps should drop less if you decide to continuously move your mouse around inside it
- Thickness changes are more drastic to help see the whole line
- Clicks now only open assignment pages if your cursor intersects a point
- Supports when assignments from different classes have the same date and score and highlights both lines on hover</ul>
- Changelog doesn't load more times than it needs to
- Changelog legend now scrolls along with the changelog
- <em>[Experiment]</em> Notification Panel<ul>
- Notification Panel now shows on click rather than on hover</ul>

### Fixed
- Issue where Empty and Non-Academic course counts showed 0 once the respective settings were disabled
- Issue with 'More' button tutorial popup
- Issue with a tutorial popup not showing up
- Issues with infinite redirects
- <em>[Mobile]</em> Issue where some navbar items were invisible

## [Beta 5.5.0] - 2022-12-04
### Added
- Navbar 'More' menu now shows when hovering on the 'More' text
- New animations throughout the site<ul>
- Added a 'Reduce Motion' toggle in 'Appearance' settings for those that might not want them</ul>
- All PowerSchool courses now sync to Graderoom, even if they have no grades<ul>
- Added a setting to enable viewing empty courses, enabled by default</ul>
- <em>[Experiment]</em> Notification Panel<ul>
- Updated animations and tweaked some things
- Added changelog notifications (They're not functional, just placeholder, so you know what they will look like)</ul>

### Improved
- Interacting with charts has gotten better! Guidelines no longer get in the way when an assignment is near your cursor.
- Updated language of 'General' settings to 'Appearance' settings since that's all they were
- Updated language of 'Beta Features' to 'Experiments' to differentiate from the beta site
- Those with inactive accounts no longer see errors with their grades
- Made Christmas Lights more efficient
- When taking an action that requires refreshing the page, Graderoom will now remain on the term/semester that you were on before making the request.
- Improved refresh-rate display and renamed it to 'Stats for Nerds'

### Fixed
- Several issues with adding/editing/removing/saving assignments
- Issue where some users' pages would not load
- Issue with analytics not refreshing daily
- Issue with snow and Christmas Lights not disabling when they should
- Blur Effects should work on Safari now
- Issue where blur color was wrong if a user had blur effects enabled while in light theme, turned them off, switched to dark system/sun/custom theme and then enabled blur effects
- <em>[Mobile]</em> Issue with Donate shiny text in mobile site

### Removed
- Changelog Legend

## [Stable 5.4.0] - 2022-11-13
### Added
- User distribution by school to charts
- Added other teacher user counts and class averages to class info

### Improved
- Changing chart-related settings no longer require refreshing the page<ul>
- These settings have also been moved to the 'General' tab
- (They also sync across devices in real time in case you do that for some reason)</ul>
- Charts page now shows old data if new data is still being processed<ul>
- and no longer stops the server from processing other requests</ul>
- Charts no longer display empty if there is no data. They show 'No Data' instead

### Fixed
- Charts page shows correct graduation data
- GPA displays now properly update after a sync
- Issue where having a category with only extra credit caused an incorrectly calculated score

## [Stable 5.3.1] - 2022-11-09
### Added
- Point-based classes now also show total points earned

### Fixed
- Issue where classes with only extra credit assignments showed a score of Infinity%

## [Stable 5.3.0] - 2022-11-08
### Added
- New Donation options
- Donations now show in account tab
- Bellarmine users can now change their last name in addition to their first name
- Basis users can change their name and graduation year
- Support for new school! (Notre Dame San Jose)
- New donations section in account tab
- Basic API key generation and pairing process
- Add +/- graph lines as a setting, disabled by default (See Settings > Advanced > Display)
- Changelog now supports `this kind of text`

### Improved
- Analytics page no longer requires login
- Fixed occasional infinite redirecting
- Links open in new tabs, so you don't lose the current state of Graderoom
- Donate button is shiny now
- Description of grade history syncing on initial sync
- Clicking on your name in the navigation bar opens account settings
- Change language between Schoology and PowerSchool where relevant
- For BCP users, course info should always work now
- When the calculated grade is correct but PowerSchool has a different letter grade, this will no longer be considered an incorrect calculation. (This applies to some BCP religion classes I think).
- Charts page is slightly more efficient

### Fixed
- Issues with syncing classes that no other user has synced before
- Issue with edited assignments not saving between page refreshes
- Issue where having an edited assignment before May 18 resulted in the page not working
- Issue with wrong theme blur effects being applied after certain theme change actions
- Issue with class navbar expanding on some browsers
- Issues with Honors and AP class weighting not being accurate
- Issues with joining and leaving the beta
- Issue with category sort causing unrounded delta values.
- Issue where new users could not use the site
- Issue with sync status not being accurate if a user logged in with their email rather than their username
- Issue where toggling beta features on and off did not work
- Issue where Basis graduation years showed as 'NaN
- Issue with UC/CSU GPA
- Unnecessary error when empty Basis graduation year
- Scraper for basis
- Errors caused by snowfall on login page
- Weighted GPA toggles now sync properly
- Issue where hovering over the sync status in the nvbar caused a solid colored area to show

## [Beta 5.2.6] - 2022-11-08
### Added
- Changelog now supports `this kind of text`

### Improved
- Rework +/- graph lines into their own setting, disabled by default (See Settings > Advanced > Display)
- Charts page is slightly more efficient
- <em>[API]</em> `/api/info` is now a `GET` endpoint
- <em>[API]</em> Endpoints with base path `/api` that don't exist now correctly return `404`

### Fixed
- Issue where hovering over the sync status in the nvbar caused a solid colored area to show
- <em>[API]</em> Issue where requests with empty API key did not cause errors

## [Beta 5.2.5] - 2022-11-06
### Added
- Horizontal lines at B+/C+/D+ for BCP students, and, additionally, A+ for BISV students

### Improved
- Removed +/- horizontal lines for NSDJ
- When the calculated grade is correct but PowerSchool has a different letter grade, this will no longer be considered an incorrect calculation. (This applies to some BCP religion classes I think).
- NDSJ letter grades should no longer have +'s and -'s

### Fixed
- Weighted GPA toggles now sync properly

## [Beta 5.2.4] - 2022-11-05
### Added
- Support for new school! (Notre Dame San Jose)
- New donations section in account tab
- Basic API key generation and pairing process

### Improved
- Change language between Schoology and PowerSchool where relevant
- For BCP users, course info should always work now

### Fixed
- Errors caused by snowfall on login page

## [Beta 5.2.3] - 2022-10-26
### Fixed
- Unnecessary error when empty Basis graduation year
- Scraper for basis

## [Beta 5.2.2] - 2022-10-25
### Added
- Bellarmine users can now change their last name in addition to their first name
- Basis users can change their name and graduation year

### Improved
- Description of grade history syncing on initial sync
- Clicking on your name in the navigation bar opens account settings

### Fixed
- Issue with sync status not being accurate if a user logged in with their email rather than their username
- Issue where toggling beta features on and off did not work
- Issue where Basis graduation years showed as 'NaN
- Issue with UC/CSU GPA

## [Beta 5.2.1] - 2022-10-24
### Fixed
- Issue where new users could not use the site

## [Beta 5.2.0] - 2022-10-23
### Added
- New Donation options
- Donations now show in account tab

### Improved
- Analytics page no longer requires login
- Fixed occasional infinite redirecting
- Links open in new tabs, so you don't lose the current state of Graderoom
- Donate button is shiny now

### Fixed
- Issues with syncing classes that no other user has synced before
- Issue with edited assignments not saving between page refreshes
- Issue where having an edited assignment before May 18 resulted in the page not working
- Issue with wrong theme blur effects being applied after certain theme change actions
- Issue with class navbar expanding on some browsers
- Issues with Honors and AP class weighting not being accurate
- Issues with joining and leaving the beta
- Issue with category sort causing unrounded delta values.

## [Stable 5.1.2] - 2022-08-19
### Improved
- New changelog layout

### Fixed
- Clarify language when no data in PowerSchool
- Issues with viewing grades after new sync
- Issues with viewing old grades
- Issues with viewing grades when any class either had no overall grade or a grade of "CR"
- No longer show semesters with no valid classes
- Issue with sticky navbar on scroll down

## [Stable 5.1.1] - 2022-05-19
### Improved
- Layout of analytics page

### Fixed
- Issue where you could not add assignments if you had previously added one in the recent months

## [Stable 5.1.0] - 2022-05-18
### Added
- More analytics charts: Users by graduation year, Usage by weekday. View in More > Analytics
- You can now set an added assignment to be excluded before you add it
- Dashed lines at A, B, C, D in addition to the existing A-, B-, C-, D- lines (by request)

### Improved
- Optimized backend. Things should feel a bit faster now.
- Upgraded to a paid-tier server
- Loading time of charts after the first load of the day by anyone (I cache the data now instead of fetching every time)

### Fixed
- An issue where entering an invalid PowerSchool password resulted in the wrong error
- Issue with editing weights in some courses
- Weights reset button displaying when it shouldn't

## [Beta 5.0.4] - 2022-05-18
### Added
- More analytics charts: Users by graduation year, Usage by weekday. View in More > Analytics
- You can now set an added assignment to be excluded before you add it
- Dashed lines at A, B, C, D in addition to the existing A-, B-, C-, D- lines (by request)

### Improved
- Loading time of charts after the first load of the day by anyone (I cache the data now instead of fetching every time)

### Fixed
- Issue with editing weights in some courses
- Weights reset button displaying when it shouldn't

## [Beta 5.0.3] - 2022-05-13
### Improved
- Optimized backend. Things should feel a bit faster now.

### Fixed
- An issue where entering an invalid PowerSchool password resulted in the wrong error

## [Stable 5.0.2] - 2022-05-02
### Fixed
- Issue where users could not reset their passwords

## [Stable 5.0.1] - 2022-05-01
### Fixed
- Issue where new users could not sync

## [Stable 5.0.0] - 2022-04-01 - April Fools!
### Added
- Updated to new database
- Appearance settings now sync instantly across devices
- Analytics charts (view in More > Analytics)
- Progress bar to sync status indicator
- Newly designed 'Add Assignment' wizard
- New 'Class Info' card<ul>
- View the class description and prerequisites as listed on the bcp website
- View the number of Graderoom users taking the course this semester
- View the Graderoom class average for the course in the current semester if there are 9 or more Graderoom users in the course this semester.
- View what grade levels take the course
- View how many credits the course is worth</ul>
- New Keyboard shortcut 'I' to view the class info of the course currently in view
- Ability to pan charts

### Improved
- Assignment percents now always display 2 decimal places. Hover over them to see more.
- Warning logs are orange instead of yellow now for better visibility
- Warnings no longer show in header bar if there are no verified weights
- 'Escape' key now dismisses expanded navbar 'more' menu, as well as the new 'Add Assignment' wizard
- Added an 'Advanced' settings tab because 'Appearance' was getting too cluttered
- Cleaned up the amount of warning icons
- Updated class catalog
- Support error for disabled accounts correctly

### Fixed
- Issue where it was possible to have weights missing from the weights table
- Issues with initial sync status being displayed incorrectly sometimes
- Issue where older semesters would show grades as "N/A" even if Graderoom had the data

### Removed
- Ability to zoom in on a section of the chart by drawing a box (in favor of allowing panning)

## [Beta 4.11.1] - 2022-04-01
### Fixed
- Issue where some categories were created out of thin air apparently

## [Beta 4.11.0] - 2022-03-27
### Added
- You can now see what grade levels take a course in the 'Class Info' card
- You can now see how many credits a course is worth in the 'Class Info' card
- Ability to pan charts

### Improved
- Sync progress indicator looks much better now
- 'Class Info' card no longer overflows off-screen
- Detection of sections of class descriptions

### Fixed
- Issue where some course descriptions were not displayed
- Issue where it was possible to have weights missing from the weights table
- Issue with sync status tutorial popup
- Issue with resetting tutorial
- Issues with initial sync status being displayed incorrectly sometimes
- Issue where older semesters would show grades as "N/A" even if Graderoom had the data

### Removed
- Ability to zoom in on a section of the chart by drawing a box (in favor of allowing panning)

## [Beta 4.10.0] - 2022-03-25
### Added
- Analytics charts (view in More > Analytics)
- Progress bar to sync status indicator
- Newly designed 'Add Assignment' wizard
- New 'Class Info' card<ul>
- View the class description and prerequisites as listed on the bcp website
- View the number of Graderoom users taking the course this semester
- View the Graderoom class average for the course in the current semester if there are more than 10 Graderoom users in the course this semester.</ul>
- New Keyboard shortcut 'I' to view the class info of the course currently in view

### Improved
- Warning logs are orange instead of yellow now for better visibility
- Warnings no longer show in header bar if there are no verified weights
- 'Escape' key now dismisses expanded navbar 'more' menu, as well as the new 'Add Assignment' wizard
- Added an 'Advanced' settings tab because 'Appearance' was getting too cluttered
- Cleaned up the amount of warning icons
- Updated class catalog
- Support error for disabled accounts correctly

### Fixed
- Issue with tutorial popups not disappearing
- Issues with weights
- Issues with sync status messages
- Issue with grade updates not happening correctly on first sync
- Issues with UC GPA
- Issue where changing color palette wouldn't show changes until refresh
- Issue where classes wouldn't load if show non-academic classes was disabled and a non-academic class was one of your odd-numbered classes
- <em>[Mobile]</em> Issue where courses showed in semi-reversed order on mobile

### Removed
- FPS chart

## [Stable 4.9.16] - 2022-01-24
### Fixed
- Resolved an error that was causing a server crash

## [Beta 4.9.15] - 2022-01-23
### Fixed
- Issue with enrolling into the beta
- Issue with changing the "regularize class graphs" setting

## [Beta 4.9.14] - 2022-01-22
### Fixed
- Issues where Basis users could not sync

## [Beta 4.9.13] - 2022-01-18
### Improved
- Migrated to new database library
- Theme switching has been moved to sockets, and is also much faster
- Appearance settings sync instantly across devices

### Fixed
- Issues with resetting weights
- Assignment percents now always display 2 decimal places. Hover over them to see more.

## [Stable 4.9.12] - 2022-01-07
### Fixed
- More crash fixes. Thank you to the users who keep finding new ways to crash the site :)

## [Stable 4.9.11] - 2022-01-06
### Fixed
- Server no longer crashes because of an out of memory error

## [Stable 4.9.10] - 2021-12-17
### Fixed
- Syncing with locked PowerSchool works again

## [Announcement 4.9.9] - 2021-12-16
- First, thank you all for using Graderoom
- Due to the huge influx of users, my server crashed at some point before 5:54 PM today, and the database decided to delete itself
- <b>Luckily, I do have a backup system in place so all data created before 12/14/21 at 9:48:35 PM will still be here</b>
- <b>If you know anyone whose account may have been lost, please inform them that this happened</b>
- The server and database library I use for this app were not designed to handle this large of a user-base, which is what caused this
- Over break, I will make changes to the software to prevent this from happening again
- Hardware-wise, better servers cost money, and I do not yet know if I plan to monetize Graderoom to support a more high-end server. Let me know if you have any feedback on this.
- -Joel

## [Stable 4.9.8] - 2021-12-14
### Fixed
- Bug that caused all users created after the 4.9.7 update to not have last names

## [Stable 4.9.7] - 2021-12-13
### Added
- Limited support for Basis Independent Silicon Valley

### Improved
- Updating weights for a class is faster now
- Signup experience

### Fixed
- Term switcher now works properly for users without beta features enabled
- Bug with auto themes showing the wrong them on load

## [Announcement 4.9.6] - 2021-12-13
- <b>Welcome new users!</b>
- I've been receiving a significant amount of feedback through the Google Form
- Since I'd like to follow up on reported issues and fix them more quickly, please join the <span style="cursor: pointer" onclick="showCard('#settingsCardDisplay'); openTab(4)" class="changelog-inline-setoff">Discord server</span>
- The Google Form will continue to be available as an alternative option.

## [Stable 4.9.5] - 2021-11-28
### Fixed
- Login bug

## [Stable 4.9.4] - 2021-10-19
### Improved
- Last synced time shows correctly after syncing without a refresh

### Fixed
- Syncing for Bellarmine users works again

## [Announcement 4.9.3] - 2021-10-12
- <span style="cursor: pointer" onclick="showCard('#settingsCardDisplay'); openTab(4)" class="changelog-inline-setoff">Click here to join the Graderoom support Discord server!</span>
- You can also use this invite link: <a href="https://discord.gg/p9kyZxuAmC">https://discord.gg/p9kyZxuAmC</a>

## [Stable 4.9.2] - 2021-10-08
### Added
- Descriptive syncing for grade history

### Fixed
- Issue with complex weighted assignments, such as VHL homework

## [Beta 4.9.1] - 2021-10-08
### Added
- Limited support for Basis Independent Silicon Valley

### Removed
- Added/Modified indicator text color

## [Stable 4.9.0] - 2021-09-05
### Added
- Appearance Settings Changes<ul>
- Renamed 'Blur Effects' to 'Blur and Transparency Effects'
- Moved 'Advanced' settings into 'Display'
- Added 'Performance' settings<ul>
- Option to keep all effects and animations running even if the window is not in focus
- Option to show current framerate<ul>
- This option enables an overlay in the bottom left corner of the screen with metrics and a 10-second history of your framerate in the form of a chart</ul></ul>
- Added 'Performance Issues Log' that logs framerate drops (This does not persist through a refresh)
- Added disclaimers that certain settings immediately refresh the page</ul>
- <span class="changelog-inline-setoff">Term Switcher</span><ul>
- Now, you can view grades from past semesters!
- Use the selector on the left side of your screen to view your old data
- All functions are supported on old semesters, but your sorting modes will not be saved for old semesters
- However, all added and edited assignments, as well as modified weights WILL be saved in old semesters</ul>
- Syncing now has a progress indicator
- Syncing now displays more useful status information
- Backend is being migrated to sockets which will be faster and more responsive across multiple devices (including the new mobile apps releasing soon)
- An option has been added to disable logging in the console
- Tutorial popups for new chart features

### Improved
- The server has been optimized to handle a greater load of requests
- Updated charts<ul>
- Now, you can select an area of the chart with your mouse to zoom into
- You can click class names in the legend to hide specific classes from the chart
- General visual updates and speedy optimizations</ul>
- Improved blur and transparency effects
- Improved winter holiday effects (You'll see them starting November)
- Certain settings, when changed, immediately apply to all logged-in devices (This functionality will be rolled out to all parts of the site in the near future)
- Login sessions persist through server restarts (max 4 hours)
- <em>[Beta Feature]</em> Notification Panel animations have improved
- <em>[Beta Feature]</em> Notification Panel now opens if mouse hovers anywhere on the right edge of the screen

### Fixed
- Server error caused by having added or edited an assignment in the 21-22 S1 term before the 4.8.1 update

### Removed
- <em>[Beta Feature]</em> Show FPS (Moved to stable)
- <em>[Beta Feature]</em> Show Term Switcher (Moved to stable)

## [Beta 4.8.2] - 2021-09-05
### Fixed
- Issue where sync log wouldn't show up after successful sync that did not require a refresh
- Issue where entering an invalid username in the login screen caused an error

## [Stable 4.8.1] - 2021-08-29
### Fixed
- Issue with syncing with PowerSchool that caused users to see a 500 Internal Server Error
- Issue with summer semesters displaying weirdly

## [Beta 4.8.0] - 2021-08-28
### Added
- Syncing now has a progress indicator
- Syncing now displays more useful status information
- Backend is being migrated to sockets which will be faster and more responsive across multiple devices (including the new mobile apps releasing soon)
- An option has been added to disable logging in the console (Mostly just a test of the new socket system)

### Improved
- Login sessions persist through server restarts (max 4 hours)
- <em>[Beta Feature]</em> Notification Panel animations have improved
- <em>[Beta Feature]</em> Notification Panel now opens if mouse hovers anywhere on the right edge of the screen

### Fixed
- Issue with syncing with PowerSchool that caused users to see a 500 Internal Server Error
- Issue with summer semesters displaying weirdly

## [Announcement 4.7.3] - 2021-08-28
- Yes, I am still developing and maintaining this site, even in college
- Lots of big changes and improvements are coming your way
- This and all future beta releases will be buggier than prior beta releases to provide beta users with the latest features faster and speed up testing
- <small>I am also working on an app called <u><a target="_blank" href="https://github.com/BlueBubblesApp/BlueBubbles-Android-App/">BlueBubbles</a></u> that you can check out if you're interested</small>
- As usual, you can fill out the feedback form or email <u><a href="mailto:support@graderoom.me">support@graderoom.me</a></u> with questions or requests
- If you want to become a beta tester or contribute to the project, contact me through the above method

## [Announcement 4.7.2] - 2021-05-20
- <span class="changelog-inline-setoff">Friendly reminder that you can still sync your grades even though PowerSchool is locked!</span>
- To take advantage of this feature, you <b>MUST</b> have synced your grades for each class at least once this semester
- What you <b>CAN</b> see:<ul type="circle">
- Changes in assignment scores, categories, dates, and exclusions</ul>
- What you <b>CANNOT</b> see:<ul type="circle">
- Overall grade changes (There is no way for Graderoom to retrieve this information</ul>
- <b>HOWEVER</b>, if your category weights are set correctly, the calculated grade is most likely correct.
- Continue to request weight verification for courses that are either unverified or verified incorrectly<ul type="circle">
- These verifications are crowdsourced and not official, so they can sometimes be incorrect.</ul>

## [Stable 4.7.1] - 2021-05-20
### Improved
- Manual sync window now closes itself after a successful sync

### Fixed
- Issue with Locked Powerschool indicators not displaying correctly in sync log

## [Stable 4.7.0] - 2021-04-18
### Added
- UC GPA details are now available under GPA Details
- Verified weights now display in popup on hover of verification checkmark
- New <span class="changelog-inline-setoff">Match System Theme</span> option that will match your device's theme preference<ul>
- Due to browser limitations, Graderoom will load in dark theme before quickly switching to the system theme
- If a system theme is unavailable, dark theme will be used
- When your system theme is changed, please allow a few seconds for Graderoom to change its theme
- Graderoom will load into an unthemed state for a few moments in between each switch</ul>
- <em>[Beta Feature]</em> Notification Panel (Not Complete)

### Improved
- Changes in overall grade are no longer added to total change count if assignment changes are present
- Weighted GPA is now a switch instead of buttons
- Detected system theme is now displayed in settings
- Verified weights that are point-based no longer show an empty table of weights
- Category dropdowns and weight tables now display full name of category on hover
- Increased text size in changelog display
- Attempting any action without a valid cookie will automatically log you out
- <em>[Mobile]</em> Grid layout of overview is now staggered to reduce wasted space
- <em>[Beta Feature]</em> New beta features are now automatically enabled if you are already enrolled in the Beta Program<ul>

### Fixed
- Issue where 'Sort by Category' did not display assignment scores
- Issue where user could manually sync grades while they were auto-syncing
- Issue with 'revert all' buttons
- Issue with auto-logout occuring when it was not supposed to
- Issue with automatic and sun themes not changing to dark on some browsers

## [Beta 4.6.0] - 2021-04-11
### Added
- UC GPA details are now available under GPA Details

### Improved
- Changes in overall grade are no longer added to total change count if assignment changes are present
- Weighted GPA is now a switch instead of buttons
- Detected system theme is now displayed in settings
- Verified weights that are point-based no longer show an empty table of weights
- <em>[Mobile]</em> Grid layout of overview is now staggered to reduce wasted space
- <span class="changelog-inline-setoff"><em>[Beta Feature]</em> Notification Panel</span><ul>
- Lots of behind-the-scenes changes
- Will be ready soon</ul>
- <em>[Beta Feature]</em> New beta features are now automatically enabled if you are already enrolled in the Beta Program<ul>
- To gain access to beta features, find the 'Join the Beta' button at the bottom of Account Settings
- Note: This is not the same as having an account at <a href="https://beta.graderoom.me">beta.graderoom.me</a></ul>

### Fixed
- Issue where 'Sort by Category' did not display assignment scores
- Issue where user could manually sync grades while they were auto-syncing
- Issue with 'revert all' buttons

## [Stable 4.5.5] - 2021-04-08
### Fixed
- Issue with overall grades being incorrect

## [Announcement 4.5.4] - 2021-03-29
- PowerSchool recently changed the way they display grades
- This change has broken some of Graderoom's functionality, specifically showing correct overall grades
- The overall grades that display currently are quarter grades from Q3, not your most recent grades
- We are working to address this issue, and a fix will be released promptly

## [Stable 4.5.3] - 2021-03-05
### Fixed
- Issue with exempt assignments not being excluded

## [Stable 4.5.2] - 2021-03-02
### Fixed
- An issue that prevented viewing grades in some cases

## [Beta 4.5.1] - 2021-02-28
### Fixed
- Issue with auto-logout occuring when it was not supposed to

## [Beta 4.5.0] - 2021-02-27
### Added
- Verified weights now display in popup on hover of verification checkmark
- New <span class="changelog-inline-setoff">Match System Theme</span> option that will match your device's theme preference<ul>
- Due to browser limitations, Graderoom will load in dark theme before quickly switching to the system theme
- If a system theme is unavailable, dark theme will be used
- When your system theme is changed, please allow a few seconds for Graderoom to change its theme
- Graderoom will load into an unthemed state for a few moments in between each switch</ul>
- <em>[Beta Feature]</em> Notification Panel (Not Complete)

### Improved
- Category dropdowns and weight tables now display full name of category on hover
- Increased text size in changelog display
- <span class="changelog-inline-setoff">Support for <a target="_blank" href="https://github.com/graderoom/app-releases/releases">Graderoom App</a></span>
- Attempting any action without a valid cookie will automatically log you out

### Fixed
- Issue with automatic and sun themes not changing to dark on some browsers

## [Stable 4.4.6] - 2021-01-30
### Fixed
- An issue with page refreshing when it was not necessary
- An issue where some extra weights were displayed if a second semester course matched a first semester course
- An issue with displaying changes in the overall grade if the previous overall grade was N/A

## [Stable 4.4.5] - 2021-01-29
### Improved
- Sign-in can now be completed with either your school email or your username
- Popups have improved readability in dark mode
- Sync issues now display in the sync log as well as the sync card

### Fixed
- A rare issue where some scores were rounded incorrectly

## [Beta 4.4.4] - 2021-01-25
### Improved
- Sign-in can now be completed with either your school email or your username
- Popups have improved readability in dark mode
- Sync issues now display in the sync log as well as the sync card

## [Stable 4.4.3] - 2021-01-19
### Improved
- Classes with solely ungraded assignments can now be viewed
- Snow disappears instead of freezing when tabbed out

## [Stable 4.4.2] - 2021-01-14
### Fixed
- Issues with sync log display
- Issue with syncing when assignments were added to once-empty courses in PowerSchool
- Issue with syncing when only ungraded assignments were in a class in PowerSchool
- <em>[Beta Feature]</em> An issue with the fps display freezing after changing holiday effect settings

## [Stable 4.4.1] - 2021-01-13
### Added
- Graderoom now displays when it is syncing grade history
- This takes up to 30 seconds when it occurs

### Fixed
- Issues with syncing
- Issues for new users

## [Stable 4.4.0] - 2021-01-12
### Added
- UC/CSU GPA
- Clicking grade deltas now open sync log
- Added and modified assignments are colored in class tables
- Changelog can now emphasize important information <span class="changelog-inline-setoff">like this</span>
- <span class="changelog-inline-setoff">GPA Details display</span><ul>
- This card displays details behind the calculations of your GPAs
- Currently, the UC/CSU GPA details is not yet available

### Improved
- Grade deltas on class pages now display changes on latest sync with changes
- Sync Log now indicates when PowerSchool was locked during sync
- Charts no longer display [Inaccurate weights] when weights are accurate
- Charts no longer become dashed when powerschool is locked and weights are correct
- Navigation bar no longer displays grades in pre-loading stage<ul>
- This prevents incorrect grades from showing briefly in the case of locked PowerSchool</ul>
- Incorrect grade messages no longer display when weights are accurate
- Incorrect grade messages have been updated to always display accurate information
- Rearranged class info<ul>
- Teacher has been moved to the right side
- Course types have been moved to the left side
- Course type language has been updated
- Weight verification status has been added to the left side</ul>
- Weight accuracy is determined by verification of weights
- Your weights are verified if <span class="changelog-inline-setoff">Weights Verified <i class="fa fa-check-circle"></i></span> is displayed in the upper left corner of the class page
- If your weights are not verified, <span class="changelog-inline-setoff">Weights Unverified <i class="fa fa-exclamation-circle"></i></span> will be displayed
- Verification of your weights will occur more quickly if you send feedback through <span class="changelog-inline-setoff">More > Send Feedback</span><ol type="1">
- Choose the option <span class="changelog-inline-setoff">Submit weights</span>
- Include the class name and teacher name of the course you would like weights to be verified for
- You should see the weights become verified shortly</ol>
- Changelog now has all versions when opened
- Changelog now remains on same version even after the page is resized or changelog is closed and reopened
- Changelog legend is much more responsive
- Styling of class navbar
- Auto disabled snow no longer changes background color
- Significantly improved initial load time
- Scores in class tables now populate instantly
- Updated some old changelog versions with the new UI
- If a page refresh is necessary to display updated grades, the sync log now displays after the refresh is complete
- Weight verification is now based on more accurate logic
- Cumulative GPAs now include current semester
- Styling and helpfulness of error messages
- <em>[Beta Feature]</em> Increased size of fps display as requested

### Fixed
- Issue with snowfall
- Issue where snow background in light mode would not disappear properly after holiday effects were disabled
- Issue where legend items on overview chart were sometimes clickable
- An issue where reverting to verified weights didn't remove the revert button in all cases
- Issues for new users
- <em>[Beta Feature]</em> Issue with fps display

## [Beta 4.3.1] - 2021-01-12
### Added
- GPA details page now has sections<ul>
- Just like the tabs in the Settings page, these sections can be switched using the arrow keys</ul>
- Cumulative GPA details are now available in the GPA details page
- GPA details now respond to the weighted GPA settings 
- A toggle has been added to GPA details to make it easier to switch between the two

### Fixed
- Styling issues with tables in dark mode
- Non-Academic, credit, and dropped courses are no longer included in the GPA details page
- Issues for new users

## [Beta 4.3.0] - 2021-01-11
### Added
- <span class="changelog-inline-setoff">GPA Details display</span>
- Currently, this display only displays details about the Semester GPA
- In the next major update, the display will be expanded to show both the Cumulative and UC/CSU GPA calculations to help with troubleshooting issues
- If you notice an error, please report it in <span class="changelog-inline-setoff">More > Send Feedback</span> and your issue will promptly be resolved

### Improved
- If a page refresh is necessary to display updated grades, the sync log now displays after the refresh is complete
- Weight verification is now based on more accurate logic
- Cumulative GPAs now include current semester
- Styling and helpfulness of error messages

### Fixed
- An issue where reverting to verified weights didn't remove the revert button in all cases

## [Beta 4.2.2] - 2021-01-10
### Improved
- Scores in class tables now populate instantly
- Updated some old changelog versions with the new UI

### Fixed
- Issue with UC/CSU GPA calculation

## [Beta 4.2.1] - 2021-01-09
### Added
- Department display in class info section

### Improved
- Word choice in class info
- Styling of class navbar
- Auto disabled snow no longer changes background color
- Significantly improved initial load time

### Fixed
- Issue where snow background in light mode would not disappear properly after holiday effects were disabled
- Issue where legend items on overview chart were sometimes clickable

## [Beta 4.2.0] - 2021-01-08
### Added
- Changelog can now emphasize important information <span class="changelog-inline-setoff">like this</span>

### Improved
- Incorrect grade messages have been updated to always display accurate information
- Rearranged class info<ul>
- Teacher has been moved to the right side
- Course types have been moved to the left side
- Course type language has been updated
- Weight verification status has been added to the left side</ul>
- Weight accuracy is determined by verification of weights
- Your weights are verified if <span class="changelog-inline-setoff">Weights Verified <i class="fa fa-check-circle"></i></span> is displayed in the upper left corner of the class page
- If your weights are not verified, <span class="changelog-inline-setoff">Weights Unverified <i class="fa fa-exclamation-circle"></i></span> will be displayed
- Verification of your weights will occur more quickly if you send feedback through <span class="changelog-inline-setoff">More > Send Feedback</span><ol type="1">
- Choose the option <span class="changelog-inline-setoff">Submit weights</span>
- Include the class name and teacher name of the course you would like weights to be verified for
- You should see the weights become verified shortly</ol>
- Changelog now has all versions when opened
- Changelog now remains on same version even after the page is resized or changelog is closed and reopened
- Changelog legend is much more responsive
- <em>[Beta Feature]</em> Increased size of fps display as requested

### Fixed
- An issue where some syncs done after PowerSchool was locked did not display their status correctly
- An issue where all classes would display in sync log with no changes
- An issue with displaying PowerSchool locked status in sync log

## [Stable 4.1.1] - 2021-01-06
### Fixed
- Syncing with PowerSchool

## [Beta 4.1.0] - 2021-01-05
### Improved
- Sync Log now indicates when PowerSchool was locked during sync
- Charts no longer display [Inaccurate weights] when weights are accurate
- Charts no longer become dashed when powerschool is locked and weights are correct
- Navigation bar no longer displays grades in pre-loading stage<ul>
- This prevents incorrect grades from showing briefly in the case of locked PowerSchool</ul>
- Incorrect grade messages no longer display when weights are accurate

### Fixed
- Issue with snowfall
- <em>[Beta Feature]</em> Issue with fps display

## [Stable 4.0.17] - 2020-12-31
### Fixed
- Issue with GradeSync

## [Beta 4.0.16] - 2020-12-28
### Fixed
- Issue in UC GPA caused by dropped classes

## [Stable 4.0.15] - 2020-12-28
### Added
- Changelog Beta versions preceding Stable 1.0.0 (0.X.X versions) have been added

## [Announcement 4.0.14] - 2020-12-18
- The following announcement is only applicable if you have successfully synced your grades at least once prior to Powerschool locking
- When PowerSchool is locked:<ul>
- Graderoom CAN sync new, modified, and removed assignments with PowerSchool
- Graderoom CANNOT yet sync overall grades with PowerSchool
- Therefore, after the addition of new assignments, messages signifying incorrect grades may pop up
- Please ignore these for now</ul>

## [Stable 4.0.13] - 2020-12-18
### Fixed
- Issue where grades could not be synced while PowerSchool was locked

## [Announcement 4.0.12] - 2020-12-18
- We are aware that connecting to PowerSchool is not working as expected
- This issue will be resolved within 48 hours
- Thank you for your patience

## [Stable 4.0.11] - 2020-12-18
### Fixed
- Issue with occasional rounding error

## [Stable 4.0.10] - 2020-12-17
### Fixed
- Issue where new users could not view cumulative gpa<ul>
- You must be at least on your second full semester at Bellarmine to view this GPA
- If you still don't have this feature, sync with PowerSchool, wait 10 seconds after the sync is complete, and refresh the page</ul>
- Issue with tutorial popups not showing up on new account creation

### Removed
- Popup inside sync log

## [Stable 4.0.9] - 2020-12-16
### Fixed
- Issue with changing advanced appearance settings
- Issue where incorrect grade messages sometimes displayed incorrect grades
- <em>[Beta Feature]</em> Issue with unnecessary refreshes when viewing old semesters

## [Beta 4.0.8] - 2020-12-16
### Fixed
- Issue where incorrect grade messages did not show overall percent

## [Stable 4.0.7] - 2020-12-09
### Fixed
- Fatal issue caused by removed assignments
- Issue with cumulative GPA being displayed when it was not necessary
- Issue with manual syncing button when PowerSchool is down
- Issue where holiday effects would not disable until refresh

## [Beta 4.0.6] - 2020-12-09
### Added
- Clicking grade deltas now open sync log
- Added and modified assignments are colored in class tables

### Improved
- Grade deltas on class pages now display changes on latest sync with changes

### Fixed
- An issue where incorrect grade messages sometimes displayed incorrect grades
- Issue with UC/CSU GPA
- <em>[Beta Feature]</em> Issue with unnecessary refreshes when viewing old semesters

## [Beta 4.0.5] - 2020-12-06
### Fixed
- An issue where new users could not view cumulative or uc gpas

## [Beta 4.0.4] - 2020-12-05
### Added
- UC/CSU GPA (Beta)<ul>
- Cumulative GPA might become incorrect. Please report this</ul>
- Both BCP weighting and UC approval of courses are now displayed on each class page

## [Stable 4.0.3] - 2020-12-04
### Fixed
- Issue with using the revert all buttons

## [Stable 4.0.2] - 2020-12-03
### Fixed
- Issue with sun theme
- Issue in sync log

## [Stable 4.0.1] - 2020-12-01
### Fixed
- An issue where dashed lines in charts were slightly shorter than they should have been.
- An issue with Chrismas Lights not pausing at low framerates when certain theme options were selected

## [Stable 4.0.0] - 2020-11-30
### Added
- New 'Sync Log' that displays all modifications, additions, and removals of assignments after each sync with changes
- Edits can now be saved to all assignments
- Added holiday effects (toggleable)
- Grades can now be synced with PowerSchool even while PowerSchool is locked<ul>
- Syncing this way will only reflect changes in assignments, not overall grades</ul>
- Navigation Bar Updates<ul>
- New 'More' section with all quick links
- Overall grades are now integrated into the class navigation bar</ul>
- Appearance Updates<ul>
- The size of the overview graph has increased
- All charts now display dashed lines at relevant letter grades
- Charts can now be panned and zoomed in all directions
- Classes with incorrect weights now display thin, dashed lines to signify inaccurate weights
- Chart tooltips now display overall letter grades at every point
- Charts of classes with inaccurate weights now always display a final point with the correct grade
- Number of recent changes is now shown along with the sync status in the main navigation bar
- Added weighting and teacher name displays to every class
- Multiple assignments with the same date now display as separate, nearby points, creating a more accurate graph with accurate timings
- Scrollbar is now hidden on main page
- Refreshed color scheme picker with new presets and new settings<ul>
- Color scheme can now always be organized/random in every preset
- Updated class color preview in light mode to include all relevant color backgrounds</ul>
- Moved changelog legend 'Back to Top' button to the top</ul>
- User Experience Updates<ul>
- Clicking on any line on the overview chart now opens the page for that class
- When adding a new assignment, date is now automatically set to today's date
- There is now a toggle (disabled by default) for displaying maximum achievable GPA
- 'Automatic Theme' is now 'Dark on Custom Schedule'
- Greatly improved speed of bulk actions on class table
- Logged out pages are now themed based on sunset and sunrise
- Custom dark theme schedule can now be adjusted to the minute and uses the browser's time picker
- More tutorial popups
- New loading animations on buttons</ul>
- Keyboard Shortcuts<ul>
- Added Keyboard shortcut 'G' for 'Sync Log'
- Added Keyboard shortcut '`' for the overview page
- Added numerical shortcuts for all classes (1 corresponds to the first class, 2 to the second, etc.)
- Keyboard shortcuts now work when caps lock is on</ul>
- <em>[Beta Feature]</em> New FPS display option

### Improved
- Tooltabs now react when a row is hovered to draw attention to their existence
- Keyboard shortcuts card displays correctly across more screen sizes
- Manual syncing with powerschool is now quicker
- Optimized load time for home page immediately after login
- Overview chart lines now return to normal immediately after the cursor leaves the chart
- All calculations now account for PowerSchool's rounding of category grades (limited to 2 decimal places)
- Improved changelog sizing
- Improved keyboard shortcuts card sizing

### Fixed
- Issue with logged-in final grade calculator not working for users without grades
- Issue where users that hid non-academic classes could not view their grades
- Keyboard shortcuts no longer fire when combined with special keys (Ctrl and/or Alt)
- Issue where refreshing or leaving the page after closing a half-complete feedback form would trigger an alert
- Issue where page would refresh after sync when it was not necessary
- Issue where tables did not refresh after sync
- Issues in final grade calculator for some users
- Issue where cards would flicker when brought to the front
- Several issues with Auto Theme
- An issue with changing school email
- <em>[Beta Feature]</em> Issue with cumulative GPA in S2 of past years
- <em>[Beta Feature]</em> Issue with 2019-2020 S1 Data showing -1 in the percent column
- <em>[Beta Feature]</em> Fixed an issue where a portion of the screen could not be interacted with when blur effects were enabled
- <em>[Beta Feature]</em> Blur effects are now out of beta! If you had blur effects enabled in the public beta, they will remain enabled
- <em>[Beta Feature]</em> Fixed several issues when viewing old semesters
- <em>[Beta Feature]</em> S0 now displays as S3 in the term switcher and is correctly organized chronologically
- <em>[Beta Feature]</em> An issue with AP Calculus BC displaying twice in S2 of 19-20

### Removed
- Panning limits on charts
- Shaded area under class graphs
- Some tutorial popups

## [Beta 3.9.0] - 2020-11-29
### Added
- Clicking on sync status in sync log now also opens sync card
- A tutorial popup to the sync log

### Improved
- Tweaked language of some tutorial popups

### Fixed
- An issue with loading indicators
- Tutorial popups sometimes displaying briefly on load
- An issue with changing school email
- Issue with auto theme
- Issue with slow toggling between weighted and unweighted GPAs
- A fatal issue with sync log after first sync after update
- <em>[Beta Feature]</em> An issue with AP Calculus BC displaying twice in S2 of 19-20

### Removed
- Removed class links tutorial popup as it interfered with proper functioning of the site
- <em>[Beta Feature]</em> Removed old semester read-only message as most users of this beta feature already know about this

## [Stable 3.8.2] - 2020-11-28
### Added
- <em>[Mobile]</em> Added ability to edit scores on mobile.

## [Announcement 3.8.1] - 2020-11-28
- Our Privacy Policy has been updated
- Our Terms and Conditions have been updated

## [Beta 3.8.0] - 2020-11-28
### Added
- New loading animations on buttons
- More tutorial popups
- New dark theme schedule options
- <em>[Beta Feature]</em> Fps display option in Beta settings

### Improved
- Sync log edge case display improvements
- First card with data on sync log is now always uncollapsed
- Moved holiday effects disabled message into settings
- Expanded holiday effects to all site pages
- Logged out pages are now themed based on sunset and sunrise
- Custom dark theme schedule can now be adjusted to the minute and uses the browser's time picker
- Holiday effects are now enabled in final grade calculator and all logged out pages
- Blur effect settings can be changed without refresh
- Disabling holiday effects is now less harsh

### Fixed
- Issues with auto theme

## [Beta 3.7.1] - 2020-11-26
### Fixed
- An issue with holiday effects that would cause lag if page was resized several times

## [Beta 3.7.0] - 2020-11-25
### Added
- Grades can now be synced even while PowerSchool is locked<ul>
- Syncing this way will only reflect changes in assignments, not overall grades</ul>
- Numerical keyboard shortcuts corresponding to each class
- Sync log now supports overall grade changes without any assignment modifications

### Improved
- Performance when completing mass actions
- Cleaned up sync log<ul>
- Clicking on navbar sync status now opens sync log
- Sync log now displays sync status
- Added shortcut to sync card in sync log</ul>
- Holiday effects now stop if they are significantly harming performance<ul>
- A message will appear in the bottom right of your screen when this happens
- Refreshing the page or toggling holiday effects to the off and on position will bring the effects back, but not permanently</ul>
- Moved changelog legend 'Back to Top' button to the top
- Keyboard shortcuts display sizing on smaller screens
- Automatic theme is now 'Schedule Dark Theme' in settings

### Fixed
- Issue with auto-theme UI
- Issue with warning messages after editing any class page
- Issue where cards would flicker when brought to front
- Keyboard shortcuts now work when caps lock is on
- <em>[Beta Feature]</em> S0 now displays as S3 in the term switcher and is correctly organized chronologically

## [Stable 3.6.1] - 2020-11-20
### Fixed
- Issue where assignments from PowerSchool with the same due date were sometimes displayed in a different order than on PowerSchool

## [Beta 3.6.0] - 2020-11-19
### Added
- Made holiday effects toggleable
- Winter snow is now properly supported in light mode

### Improved
- Refreshed color scheme picker with new presets and new settings
- Color scheme can now always be organized/random in every preset
- Updated class color preview in light mode to include all relevant color backgrounds
- Scrollbar is now hidden from main page

### Fixed
- Issue with turning on blur after changing theme without refresh
- Issues in final grade calculator for some classes
- An issue that prevent users who had not synced in a while from syncing

### Removed
- Shaded area under class graphs

## [Beta 3.5.2] - 2020-11-16
### Fixed
- Issue with extra rounding in grade step calculations

## [Stable 3.5.1] - 2020-11-15
### Fixed
- Issue with showing new versions if latest version is not a stable version

## [Beta 3.5.0] - 2020-11-15
### Added
- X direction panning and zooming of charts

### Improved
- Multiple assignments with the same date now display as separate, nearby points, creating a more accurate graph with accurate timings
- Calculations now account for PowerSchool's rounding of category grades
- All calculations are now limited to 2 decimal places to better match PowerSchool
- Stability of winter snow
- Changelog sizing and changelog legend positioning

### Fixed
- Issue where assignments from PowerSchool with the same due date were sometimes displayed in a different order than on PowerSchool
- Issue where snow would sometimes form a horizontal line if page was not in focus

## [Beta 3.4.0] - 2020-11-12
### Added
- Toggle for showing Maximum achievable GPA
- Weighting and Teacher Name display
- Winter snow (Only visible in dark mode)
- Number of recent changes is shown along with sync status in the main navbar
- <em>[Beta Feature]</em> FPS display

### Improved
- Date is automatically set to current date when adding an assignment
- Sync Log now only displays when there are changes
- Blur Effects

### Fixed
- Issue where page would refresh after sync when it was not necessary
- Issue where some info would be incorrect in sync log after sync
- Issue where tables did not refresh after sync
- Issue with light mode blurring

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
- <em>[Beta Feature]</em> Fixed several issues when viewing old semesters

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
- <em>[Beta Feature]</em> If you had blur effects enabled in the public beta, they will remain enabled.

### Improved
- Recent Changes now displays a detailed history
- Integrated overall grades into class navbar and increased size of overview graph
- Several browser-specific stability improvements
- Sizing of settings card
- <em>[Beta Feature]</em> Several styling improvements to term switcher

### Fixed
- Issue where spamming the sync grades button was possible
- Several issues with Recent Changes
- Attempt to prevent keyboard shortcuts from firing when combined with special keys (Ctrl and/or Alt)
- <em>[Beta Feature]</em> Issue where a portion of the screen could sometimes not be interacted with when blur effects were enabled

### Removed
- <em>[Beta Feature]</em> Ability to tweak blur amount

## [Beta 3.2.1] - 2020-10-13
### Fixed
- Issue where users that hid non-academic classes could not view their grades

## [Beta 3.2.0] - 2020-10-10
### Added
- New 'Recent Changes' Card that displays all modifications, additions, and removals of assignments after each sync
- Keyboard shortcut 'G' for 'Recent Changes' Card
- New 'More' section to the main navbar
- <em>[Beta Feature]</em> Message stating that old semesters are view-only. Edits will not be saved.

### Improved
- Tooltabs now react when a row is hovered to draw attention to their existence
- Keyboard shortcuts card displays correctly across more screen sizes
- Several smaller styling and smoothness improvements

### Fixed
- Issue with logged-in final grade calculator not working for users without grades
- <em>[Beta Feature]</em> Issue where blur effects would not be applied to elements if interacted with immediately on page load
- <em>[Beta Feature]</em> Issue with cumulative GPA in S2 of past years
- <em>[Beta Feature]</em> Issue with 2019-2020 S1 Data showing -1 in the percent column

### Removed
- Quick Links section of Settings
- Some tutorial popups (More will be added in the future)

## [Stable 3.1.0] - 2020-10-02
### Added
- Descriptions to mass modification buttons
- <em>[Beta Feature]</em> Added blur effect option and blur effect settings

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
- <em>[Beta Feature]</em> Added blur effect option and blur effect settings

## [Beta 3.0.5] - 2020-09-14
### Fixed
- Issue with some classes incorrectly included in GPA calculation

## [Stable 3.0.4] - 2020-09-14
### Improved
- <em>[Beta Feature]</em> All beta features are enabled by default when a user joins the beta

### Fixed
- Issue where grades could not be manually synced
- <em>[Beta Feature]</em> Issue where old data would not update correctly

## [Stable 3.0.3] - 2020-09-03
### Improved
- Made GPA Displays smaller and added theoretical maximums
- Moved weighted GPA toggle to homepage
- <em>[Beta Feature]</em> New, less intrusive design for term switcher
- <em>[Beta Feature]</em> Moved 'Leave Beta' button to Beta Settings

### Fixed
- Issue where new weights would not update automatically after sync
- Issue with password reset

## [Stable 3.0.2] - 2020-08-27
### Added
- GPA display now indicates if the displayed GPA is weighted or unweighted
- New public beta. Join by scrolling to the bottom of Account Settings
- <em>[Beta Feature]</em> Enable viewing data from previous semesters

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
- Class navbar now remains at the top of the screen when scrolling down
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
- Brand-new color scheme presets in appearance settings
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
- Spacing in account settings has been improved so that content does not flow off-screen
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
- What's New display now shows announcements
- What's New display can display multiple missed versions
- GradeSync is more clear when enabled
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
- <em>[Mobile]</em> Navbar now has important information such as sync status and username easily visible
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
- Grades can be synced without refreshing the page in most cases

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
- Brand-new color scheme presets you can choose from

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
- <em>[Mobile]</em> Navbar now has important information such as sync status and username easily visible

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
- What's New display now shows announcements
- What's New display can display multiple missed versions

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
- Spacing in account settings has been improved so that content does not flow off-screen
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
- Crowdsourced weight population
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
- During testing, some beta user's weights were lost. Although this data could be restored from the database backups, due to the beta nature of this issue and the relatively small inconvenience this will cause, this weight data will not be recovered
- Send feedback if you have any questions, comments, or concerns

## [Beta 1.5.0] - 2020-03-20
### Added
- Semester GPA Display
- Ungraded assignments display in table and graph

### Improved
- Appearance fixes that improve screen usage on taller screen sizes (Mobile not supported)
- Crowdsourced weights are now prioritized by when the user last synced grades to improve reliability
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
- If you find an issue with the autopopulated weights, send feedback in Settings > About > Feedback Form

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
- Brand-new changelog display that, by default, displays once every 24 hours. This can be changed in settings
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
- On March 2, 2020, at about 8 AM PST, Graderoom encountered a server error
- Unfortunately, all user accounts created after January 7, 2020, were deleted
- Passwords and personal user data were not compromised
- If your account still exists, you will be asked to sync your grades with PowerSchool to recover your data
- Please inform anyone affected by this issue to create a new account
- The Graderoom Team apologizes for the great inconvenience this has caused and has taken strict measures to prevent a similar event from occurring again
- Request another beta key by emailing <span class="changelog-inline-setoff"><a href="mailto:support@graderoom.me">support@graderoom.me</a></span> or asking a developer directly

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
- Customized Final Grade Calculator

### Improved
- Graderoom now logs you out 4 hours after you log in for security

### Fixed
- Significantly decreased lag on initial load of overview page
- Solved issue where new users could not sync with PowerSchool

### Removed
- Removed beta key requirement for stable site

## [Beta 0.11.1] - 2020-02-25
### Improved
- Username display is now name display
- Auto theme settings are now saved

### Fixed
- Issues with focus on card inputs

## [Beta 0.11.0] - 2020-02-24
### Added
- Keyboard shortcut 'W' for edit weights

### Improved
- Category chart does not display for point-based classes
- UI Improvements
- Navbar styling
- Class navbar styling

### Fixed
- Bug in edit weights formatting
- Chart for point-based classes
- Overall grade calculator for point-based classes
- Auto theme
- Mini loading display styling

## [Beta 0.10.2] - 2020-02-23
### Improved
- Update weights card now prepopulates with partial existing weights

### Fixed
- Dark mode icons
- Colors in update weights
- Bug with auto theme

## [Beta 0.10.1] - 2020-02-22
### Added
- Graderoom remembers which class you were looking at and opens it even after refresh (resets after logout/login)
- Excluded assignments now have indicators that they are excluded in both the chart and the table

### Improved
- Sizing of settings card
- Category grade no longer displays if points possible is 0

### Fixed
- Edge cases of 'auto' theme

### Removed
- Ability to dismiss missing weights messages

## [Beta 0.10.0] - 2020-02-21
### Added
- Settings to modify auto theme bounds
- Ability to edit weights one at a time
- Info when grade scrape errors
- Letter and percentage to category grades

### Improved
- Expanded auto theme to all pages
- Theming for dark/light mode
- Redesigned edit weights
- Redesigned messages
- Individual weight missing messages

### Fixed
- Issue with setting light theme after auto theme

## [Beta 0.9.1] - 2020-02-18
### Improved
- When setting auto theme time bounds, theme updates instantly if current time is within bounds

## [Beta 0.9.0] - 2020-02-17
### Added
- Automatic theme option<ul>
- Theme will change between light and dark without refreshing page at times set</ul>

### Improved
- Random color generation
- Arrow keys can now be used to move through tabs in settings
- Checking for sync completion now happens instantly on page load
- Expanded offline theming to all logged-out pages
- Changing theme in settings occurs instantly without refreshing the page
- Settings card
- Popup in sync grades card
- Default theme is now 'auto'
- Class colors can now be changed one at a time

### Fixed
- <em>[Mobile</em> Invisible navbar icon in light-mode

## [Beta 0.8.3] - 2020-02-15
### Improved
- Random color generation

## [Beta 0.8.2] - 2020-02-14
### Improved
- Light mode is much better
- Improved random color generation

## [Beta 0.8.1] - 2020-02-11
### Added
- New layout
- New color scheme

### Improved
- Default appearance is stored on login<ul>
- Logged-out pages will maintain the same theme you had while logged in</ul>

## [Beta 0.8.0] - 2020-02-10
### Improved
- Clicking on the ⓘ next to the GradeSync toggle now checks the checkbox
- Instructions for using GradeSync
- Page does not reload if no real changes were made<ul>
- This applies to syncing and updating weights</ul>
- Reorganized settings card

### Fixed
- Issue with infinite loading on manual sync
- Prevent autorefresh from refreshing infinitely

### Removed
- Subtabs in settings
- Non-functional buttons in navbar while on final grade calculator page
- Betakey requirement on the stable site

## [Beta 0.7.1] - 2020-02-08
### Improved
- Checkboxes now return to their real values after settings is closed even if page is not refreshed
- Old password is now required to change password

### Fixed
- Issue with autorefresh settings message

## [Beta 0.7.0] - 2020-02-07
### Added
- New autorefresh settings<ul>
- When enabled, page refreshes automatically after sync in background
- When disabled, click refresh to refresh the page after background sync</ul>
- Toggle to turn off Gradesync in settings
- Option to refresh page on background update loading indicator if autorefresh is disabled

### Improved
- Formatting of account settings
- Changed smartsync to Gradesync
- Loading indicators show during background update

### Fixed
- Issue where syncing loading indicator would spin infinitely after syncing manually
- Issue with creating new account
- Issue with changing password
- Issue where changing password would break Gradesync
- Loading indicator no longer says syncing when not actually syncing

## [Beta 0.6.0] - 2020-02-06
### Improved
- Show system font until custom font loaded
- Named autosync smartsync
- Update grades card dynamically changes if smartsync is enabled
- Respond with correct error message if incorrect Graderoom password
- Grades now update in the background<ul>
- The page will initially load with old data
- Once the sync is completed in the background, the page will refresh automatically</ul>

### Fixed
- Issue caused by entering an incorrect Graderoom password

## [Beta 0.5.1] - 2020-02-05
### Improved
- Finalized autosync on login<ul>
- You may experience longer sign-in times
- This is being worked on</ul>

### Fixed
- School email input validation

## [Beta 0.5.0] - 2020-02-04
### Added
- Grade update now occurs in background while loading indicator is displayed
- Page reloads after exiting the sync grades card
- Autosync option<ul>
- Check the box in the sync grades card
- You will then be prompted to enter both your school password and your Graderoom password
- Your school password will be used to encrypt your Graderoom password and securely store it</ul>
  
### Improved
- When you open the sync grades card, the graderoom password field is focused
- If the sync fails, the field is refocused

## [Beta 0.4.0] - 2020-01-29
### Added
- Beta site at <span class="changelog-inline-setoff"><a href="https://beta.graderoom.me">this link</a></span><ul>
- Both sites still require beta keys
- Your data will not transfer over
- Features will be released first to the beta site once a stable version is released
- But, you are more likely to encounter issues
- If you are interested, please contact a developer</ul>

### Improved
- Weight inputs are disabled for point-based classes

### Fixed
- Another issue with final grade calculator

## [Beta 0.3.6] - 2020-01-28
### Improved
- Error messages
- Empty graph is now hidden when user has not yet synced with PowerSchool

### Fixed
- Issue with prompt to sync grades on new account creation
- An issue with some scores not being parsed correctly
- Issue in final grade calculator caused by selecting a weight with no current points

## [Beta 0.3.5] - 2020-01-26
### Improved
- Chart tooltips everywhere

## [Beta 0.3.4] - 2020-01-24
### Added
- Message urging syncing grades on new account creation

### Fixed
- Issue with grade calculation in final grade calculator

## [Beta 0.3.3] - 2020-01-22
### Improved
- Experience with settings weights

### Fixed
- Issue with classes containing dots (e.g. U.S. History AP)

## [Beta 0.3.2] - 2020-01-21
### Fixed
- Issue with ungraded categories (i.e. a category with no graded assignments)

## [Beta 0.3.1] - 2020-01-15
### Fixed
- Issue with Semester 1 weights staying after shift to Semester 2

## [Beta 0.3.0] - 2020-01-14
### Added
- Final Grade Calculator<ul>
- When Logged in<ul>
- Select a class to display your current grade
- Choose a letter grade or enter a custom goal
- Enter how much your final is worth
- You can also choose a category that your final will be in
- Then, enter the number of points it is worth
- Graderoom will tell you  how much your final is worth (if applicable)
- And, of course, the necessary score to achieve your goal will be displayed</ul>
- When Logged out<ul>
- Enter your current grade
- Choose a leter grade or enter a custom goal
- Enter how much your final is worth
- The necessary score to achieve your goal will be displayed</ul></ul>

## [Beta 0.2.24] - 2020-01-13
### Fixed
- Non-function point-based button

## [Beta 0.2.23] - 2020-01-09
### Added
- You can now use the arrow keys to move through class pages

## [Beta 0.2.22] - 2020-01-08
### Added
- New icon!

### Improved
- Centered overview graph

## [Beta 0.2.21] - 2019-12-11
### Added
- Beta key requirement to sign up<ul>
- Beta keys are one-time use only</ul>

### Improved
- Category grade display now displays more information

### Fixed
- Shifting when weight input underlined
- Issue with edit weights button

## [Beta 0.2.20] - 2019-12-10
### Added
- Points display for each category
- Tooltips now include assignment categories
- Classes overview table

### Improved
- Choosing a class in update weights now changes the class page behind it

### Fixed
- <em>Mobile</em> Issues with mobile navbar

## [Beta 0.2.19] - 2019-12-09
### Improved
- Force HTTPS

## [Beta 0.2.18] - 2019-12-08
### Added
- Loading screen animation

### Fixed
- Issue where 0 weight values were considered missing
- Issue with closing edit weights with escape key

## [Beta 0.2.17] - 2019-12-07
### Improved
- Category colors now match class colors
- Weights card opens automatically to class with missing weights

### Removed
- Close button for missing weights messages on edit weights card
- Alerts for classes with one weight

## [Beta 0.2.16] - 2019-12-05
### Added
- Button and Google Form to submit feedback

## [Beta 0.2.15] - 2019-12-04
### Improved
- Weights card UX

## [Beta 0.2.14] - 2019-12-03
### Added
- Edit weights button to navbar
- Category grades display
- Overall grades display

### Improved
- Formatting of overall grade
- Accuracy of calculated final grade

### Fixed
- Bug caused by users with no weights
- Detecting existing weights

## [Beta 0.2.13] - 2019-12-02
### Added
- Subtabs in appearance settings
- Button to edit weights from missing weight message 
- HTTPS

### Fixed
- Issue with failed message not clearing after success

## [Beta 0.2.12] - 2019-11-27
### Added
- Color randomizer for class colors

## [Beta 0.2.11] - 2019-11-26
### Improved
- Added messages for last updated time

### Fixed
- Issue with change password UI

## [Beta 0.2.10] - 2019-11-25
### Added
- Class colors

### Fixed
- Issue that broke syncing
- Several bugs

## [Beta 0.2.9] - 2019-11-15
### Improved
- Improved charts

### Fixed
- Issue where logging in with a non-existent username would crash server

## [Beta 0.2.8] - 2019-11-14
### Improved
- Graph styling
- Redesigned weight input

## [Beta 0.2.7] - 2019-11-11
### Added
- Messages in weight input

## [Beta 0.2.6] - 2019-11-07
### Added
- Theme now saves to your account

### Improved
- Opacity of blur behind cards
- Text near checkboxes can now be clicked to click the checkbox

### Fixed
- Issues with settings not resetting when settings is closed without saving changes

## [Beta 0.2.5] - 2019-11-06
### Improved
- Form inputs clear when card is closed without submitting

### Fixed
- Issue where missing weights showed when weights weren't missing
- Account settings input validation
- Issue with updating grades

## [Beta 0.2.4] - 2019-11-05
### Fixed
- Issue with classes that had names with dots in them (e.g. U.S. History AP)

## [Beta 0.2.3] - 2019-11-04
### Added
- Support for extra credit assignments

### Improved
- Update weights option only shows when missing weights
- Weight updates work without refresh

## [Beta 0.2.2] - 2019-11-03
### Improved
- Weights card classes are now collapsed in an accordion style
- Input weight styling
- Weights card automatically opens to currently open class
- Added Account and Appearance tabs to settings
- Account settings no longer require page refresh
- Improved theme changing

## [Beta 0.2.1] - 2019-11-02
### Added
- Class-by-class missing weights messages

### Improved
- Alerts are now dismissible
- Chart hover effects
- Styling of class links
- Weight input is now a number

### Fixed
- Default theme

## [Beta 0.2.0] - 2019-11-01
### Added
- Basic overview graph<ul>
- Color-coded classes with legend</ul>

### Improved
- Default theme is dark
- Scrollbars in cards
- Current weights populate weight inputs

### Fixed
- Scrollbar issue in Firefox
- Scrollbar issue in Edge
- Various issues in Edge
- Missing weights message

## [Beta 0.1.12] - 2019-10-31
### Improved
- Weight input styling
- Centered username on navbar

## [Beta 0.1.11] - 2019-10-30
### Added
- Basic weights input

### Fixed
- Various issues

## [Beta 0.1.10] - 2019-10-29
### Fixed
- Various issues

## [Beta 0.1.9] - 2019-10-27
### Added
- Cards close when clicked out of

## [Beta 0.1.8] - 2019-10-26
### Improved
- Page load time

## [Beta 0.1.7] - 2019-10-25
### Added
- Cards remain open after refresh

## [Beta 0.1.6] - 2019-10-24
### Improved
- <em>[Mobile]</em> Navbar collapses on tablets

## [Beta 0.1.5] - 2019-10-20
### Added
- Path '/s' for switching mode for testing

### Improved
- Light mode coloring

### Fixed
- Issue with closing cards with escape key
- Positioning of navbar elements
- Settings icon on navbar

## [Beta 0.1.4] - 2019-10-19
### Fixed
- An error with theme switching

## [Beta 0.1.3] - 2019-10-18
### Added
- Rudimentary light mode<ul>
- Activate by using the path /switch-mode</ul>

### Improved
- Settings are now a card popup instead of a separate page
- Logo changes based on theme

## [Beta 0.1.2] - 2019-10-16
### Fixed
- Syncing while PowerSchool is locked no longer deletes grade data

## [Beta 0.1.1] - 2019-10-14
### Improved
- <em>Mobile</em> Scaling on mobile

## [Beta 0.1.0] - 2019-10-13
### Added
- Navbar to settings page
- Tooltips now show assignment names
- Tooltips now show assignment scores

### Improved
- Scores now display in a single table cell
- Tooltips now only show date
- Card widths
- Styling of messages
- UI of class links
- Update grades can be exited with escape

### Fixed
- Issue with multiple horizontal lines on class pages
- Various errors

## [Beta 0.0.14] - 2019-10-12
### Added
- Overview table
- Class tables

### Improved
- Chart is now centered

## [Beta 0.0.13] - 2019-10-11
### Improved
- Chart implementation
- Chart styling

## [Beta 0.0.12] - 2019-10-10
### Added
- Calculated overall grades
- Rudimentary chart implementation
- Overall grade display
- Support for classes with no weights in calculations

### Improved
- Account creation experience

### Fixed
- Rounding error

## [Beta 0.0.11] - 2019-10-09
### Added
- Return button in sync card

### Improved
- Styling of sync card
- Card width
- Alert colors
- Settings page

### Fixed
- Issue with school username settings

## [Beta 0.0.10] - 2019-10-08
### Improved
- Settings page UI
- Card styling

## [Beta 0.0.9] - 2019-10-06
### Improved
- Styling and spacing of navbar
- <em>[Mobile]</em> Navbar styling on smaller displays
- <em>[Mobile]</em> Mobile navbar collapses when clicked out of

### Fixed
- Issue where invalid signup messages were not displayed

## [Beta 0.0.8] - 2019-10-05
### Added
- Support for excluded assignments
- Uniform navbar on all pages

### Improved
- Design of settings page
- Buttons on navbar

### Fixed
- Issue with syncing with PowerSchool
- Issue with changing password

### Removed
- School password requirement for inital sync from signup page

## [Beta 0.0.7] - 2019-10-04
### Added
- Added icons to username and password fields on login and signup pages
- Added 'return to login' option from the signup page

### Improved
- Updated logo
- Updated font
- Redesigned UI of signup pages

## [Beta 0.0.6] - 2019-10-03
### Improved
- Redesigned login screen
- Made login page the default page
- Login page now displays message after failed login

### Removed
- Landing page

## [Beta 0.0.5] - 2019-10-02
### Added
- Settings page
- Graphs now use date from PowerSchool on the x-axis

## [Beta 0.0.4] - 2019-10-01
### Added
- Initial chart design
- Initial class page design
- Logout button
- Class navbar, support for viewing multiple classes

### Fixed
- Syncing with PowerSchool and response messages
- Issue where ungraded classes (e.g. Homeroom) were being synced

## [Beta 0.0.3] - 2019-09-30
### Added
- Ability to sync grades with PowerSchool
- Icon

## [Beta 0.0.2] - 2019-09-29
### Fixed
- Prevent duplicate user creation

## [Beta 0.0.1] - 2019-09-26
### Added
- Landing page, login page, homepage, and signup page

## [Beta 0.0.0] - 2019-09-17
### Added
- First commit
- Connection to PowerSchool
