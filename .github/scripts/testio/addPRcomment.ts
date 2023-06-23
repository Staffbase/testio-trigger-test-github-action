import * as github from "@actions/github";
import * as fs from "fs";
import {Octokit} from "@octokit/rest";

async function addComment() {
    const commentTemplate = fs.readFileSync(`${process.env.TESTIO_SCRIPTS_DIR}/exploratory_test_comment_template.md`, 'utf8');
    const jsonString = fs.readFileSync(`${process.env.TESTIO_SCRIPTS_DIR}/exploratory_test_comment.json`, 'utf8');
    const requiredInformationPlaceholder = "$$REQUIRED_INFORMATION_TEMPLATE$$";
    const commentBody = commentTemplate.replace(requiredInformationPlaceholder, jsonString);

    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    await octokit.rest.issues.createComment({
        repo: github.context.repo.repo,
        owner: github.context.repo.owner,
        issue_number: github.context.issue.number,
        body: commentBody,
    });

}

addComment().then();