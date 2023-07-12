@bot-testio exploratory-test submit
```json
{
  "test_environment": {
    "url": "[your URL of preview deployment or built bundle from bot-the-builder](https://testio.staffbase.rocks/?_preview_version=10114)",
    "access": "user: staffbaseuser1	password: posting-earshot-vertices"
  },
  "feature": {
    "title": "Authentication",
    "description": "Users need to be authenticated successfully",
    "howtofind": "Open the app",
    "user_stories": [
      "Ensure that the user can log in successfully with the given credentials"
    ]
  }
}

```
As response to [test creation trigger](https://github.com/Staffbase/testio-management/pull/65#issuecomment-1630428945).