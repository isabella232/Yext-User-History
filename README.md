# Component Guide
Yext's User History component displays a user’s journey through your help site, up until and after case creation. Arm your agents with this data so they can provide more relevant answers.
## Prequisites
Your Zendesk or Freshdesk integration must be configured to capture a user’s identity. Reference this step <link> in the installation guide to set this up.
## Configuration
The only variable neded to configure this component in your [[Zendesk/Freshdesk]] case view is a Yext App API key. To create ann app in your Yext platform reference this guide. Your app will need permissions for the Logs endpiont. Your app name is arbitrary but we suggest naming it “User History Component”.
Note: This component uses the Knowldge API which has a default quota of 5,000 requests per hour including all includes Analytics, Listings, Knowledge Manager, Reviews, Social, and User endpoints. 5,000 requests per hour.
The component three API requests per page load. If you need increased API quota reach out to your Yext account manager or submit a ticket at support@yext.com.
## How to Use
This component displays all actions (searches, clicks, etc.) taken by the ticket requester in any search experience associated with your Yext account that are configured to capture users’ identity.
Changing the ticket requester will change the results dispalyed.
It returns up to the 100 latest actions.
### User Activity Summary
The User Activity Summary highlights up to the five most recent queries and content (any entity type) viewed. The latest events appear first. Content is also clickable.
### User Activity Timeline
The User Activity Timeline section displays a timeline of actions taken by the user. It displays the ten most recent actions by default. Click ‘Show More’ at the bottom of the component to view an additional ten. Content is also clickable where possible. 
