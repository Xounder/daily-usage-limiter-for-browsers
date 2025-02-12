# daily-usage-limiter-for-browsers

A simple userscript that limits daily browsing time with notifications and automatic blocking once the set time is reached. Ideal for managing daily internet usage in shared environments like internet cafés and study centers, and can also be used for parental control.

## Features

- **Daily Time Limit**: The script limits daily browsing time, with the user being notified as the time approaches its limit. Notifications will be sent at ***30 minutes***, ***15 minutes***, ***5 minutes***, and ***1 minute*** before the limit is reached.
- **Automatic Blocking**: Once the configured time limit is reached, **access to non-permitted sites and channels is ***automatically blocked*****.
- **Admin Interface**: An admin interface, protected by a password, allows you to configure the ***maximum usage time***, ***add*** or ***remove*** ***allowed sites and channels***, or ***view the current usage status***.
- **Parental Control and Shared Environments**: Ideal for managing internet usage time, whether in a family environment for parental control or in shared spaces like internet cafés.

## How to Install

1. **Install the Tampermonkey Extension**:
   - Download and install the [Tampermonkey](https://www.tampermonkey.net/) extension in your browser.
   
2. **Create a New Script**:
   - Open the Tampermonkey dashboard and create a new script.
   - Paste the provided code (the script code you shared).
   - Save the script.

3. **Initial Configuration**:
   - After installation, the script will start working automatically.
   - The maximum browsing time is set to 2 hours by default, but it can be adjusted via the admin interface (see below).

## Customization

You can customize the script by adjusting the following settings directly in the code:

- **Maximum Usage Time**: Modify the value of `DEFAULT_MAX_USAGE_TIME` for the desired maximum time in minutes. The default value is 120 minutes (2 hours).
  
  Example: To set a 1-hour limit, change it to `const DEFAULT_MAX_USAGE_TIME = 60;`.

- **Allowed Sites**: Add or remove URLs from the allowed sites list (`allowedSites`) to grant unrestricted access to those sites.

  Example:
  ```javascript
  const allowedSites = [
    "https://example.com", // Add initial sites that you want to allow here.
    "https://another-example.com"
  ];
  
- **Allowed Channels**: Similar to sites, add or remove allowed channels from the list (`allowedChannels`) to grant ***unrestricted access*** to those channels.

- **Admin Password**: The default admin panel password is `"BebaAwa"`. To change it, simply edit the value of `ADMIN_PASSWORD`.

## How to Use

- **Time Notifications**: The script will notify the user with ***30 minutes***, ***15 minutes***, ***5 minutes***, and ***1 minute*** warnings before the time limit is reached.

- **Site and Channel Blocking**: When the **maximum browsing time** is reached, the script will automatically block access to **non-permitted sites**.
  
- **Admin Panel Access**: To access the ***admin interface*** and configure the usage time or modify the allowed sites and channels, ***press the * key*** ~~(modify the `key` variable to change the button that is pressed)~~. The ***admin password*** will be required to add or remove channels and sites, as well as to reset the usage time.
  
