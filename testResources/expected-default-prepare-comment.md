
@bot-testio exploratory-test preparation
```json
{
  "test_environment": {
    "url": "your URL of preview deployment or built bundle from bot-the-builder",
    "access": "provide credentials for the tester to access the environment"
  },
  "feature": {
    "title": "The name of the feature to be tested",
    "description": "A short description of the feature to be tested",
    "howtofind": "Describe where to find the feature to be tested",
    "user_stories": [
      "Add 1 or more user stories here which you want the tester to verify"
    ]
  },
  "additionalInstructions": "(optional, remove it if not needed)"
}

```
As response to [test creation trigger](https://github.com/Me/awesomeRepo/issues/666/comments#987654321).