# Trigger a Test on the Crowd-Testing Platform TestIO from a Pull Request 

## Description

This GitHub Action can be used to trigger a new test on the external crowd-testing platform [TestIO](https://test.io/services/exploratory-testing) from a GitHub pull request (PR).
Once this action is available in your repository you can use it by adding and editing specific comments in any PR.

> ##### Note: For being able to use this action you need to be a customer of TestIO.

## Usage

### Enable the Action in Your Repository 

```yaml
jobs:
  testio-trigger-test:

    name: TestIO - Trigger Test
    runs-on: ubuntu-22.04
    if: startsWith(github.event.comment.body, '@bot-testio exploratory-test')     # this is the prefix all subsequent comments must start with

    steps:
      - name: Request required input and trigger test on TestIO
        uses: Staffbase/testio-trigger-test-github-action@v1.0.0
        with:
          testio-slug: your-testio-slug
          testio-product-id: your-testio-product-id
          github-token: ${{ secrets.YOUR_GITHUB_TOKEN }}
          testio-token: ${{ secrets.YOUR_TESTIO_TOKEN }}
```

### Use the Action in a PR

To trigger a test on TestIO multiple steps are required:

1. Add the comment `@bot-testio exploratory-test create` to the PR from which the test should be triggered.
   <img src="docs/assets/images/test-create.png" alt="create test comment" width="300" />
2. The action acknowledges your intention to trigger a new test by commenting in the PR with a message for requesting required information:
   <img src="docs/assets/images/test-prepare.png" alt="prepare test comment" width="300" />
3. Provide the required information by editing the comment added in step 2.
4. Once you entered all the required information in the edited comment you need to replace `@bot-testio exploratory-test preparation` by `@bot-testio exploratory-test submit`.
   <img src="docs/assets/images/test-submit.png" alt="submit test comment" width="300" />
5. This triggers the test on TestIO and successful creation is commented back as a new comment.
   <img src="docs/assets/images/test-success.png" alt="success test comment" width="300" />

## Action Specification:

### Inputs

| Input              | Description                                                  | Required |
| ------------------ | ------------------------------------------------------------ | -------- |
| `testio-slug` | TODO | true     |
| `testio-product-id`   | TODO | false    |
| `github-token` | TODO                   | true     |
| `testio-token` | TODO               | true     |

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## License

This project is licensed under the Apache-2.0 License - see the [LICENSE.md](LICENSE) file for details.

<table>
  <tr>
    <td>
      <img src="docs/assets/images/staffbase.png" alt="Staffbase GmbH" width="96" />
    </td>
    <td>
      <b>Staffbase GmbH</b>
      <br />Staffbase is an internal communications platform built to revolutionize the way you work and unite your company. Staffbase is hiring: <a href="https://staffbase.com/jobs/" target="_blank" rel="noreferrer">staffbase.com/jobs</a>
      <br /><a href="https://github.com/Staffbase" target="_blank" rel="noreferrer">GitHub</a> | <a href="https://staffbase.com/" target="_blank" rel="noreferrer">Website</a> | <a href="https://staffbase.com/jobs/" target="_blank" rel="noreferrer">Jobs</a>
    </td>
  </tr>
</table>