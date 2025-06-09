# 🔍 AI LinkedIn Job Scraper

This Apify actor helps job seekers find tailored job opportunities on LinkedIn by analyzing their CV and preferences using AI. It intelligently matches your profile with current job listings based on your goals, experience, and preferred work conditions.

---

## ✍️ Input Fields

The actor requires the following inputs:

- **CV Content (`cvContent`)**  
  Paste the content of your CV here, either in plain text or Markdown. This will be used to extract your experience, strengths, and possible roles.

- **Preferred Work Environment (`workEnv`)**  
  Select one of the following:  
  `onSite`, `hybrid`, or `remote`

- **Preferred Work Type (`workType`)**  
  Select one of:  
  `fullTime`, `partTime`, `contract`, or `internship`

- **Location (`workLocation`)**  
  Enter your preferred job location (e.g., “Prague, Czechia”). Use the name format shown on the [LinkedIn Job Search Page](https://www.linkedin.com/jobs/search).

- **Prompt (`prompt`)**  
  A free-form description of what kind of role you’re looking for. For example:  
  “I want a backend role in a fast-paced startup where I can grow technically and work with a small team.”

- **Number Of Results (`targetNumResults`)**  
  Maximum number of job matches to return (up to 20).

---

## 🧠 What It Does

This actor uses AI to act like a smart job-matching agent. Here’s what it does in simple terms:

1. **Understands You**  
   It reads your CV and prompt to understand your background, preferences, and career direction.

2. **Finds Relevant Jobs**  
   It looks for active job posts on LinkedIn that match your input preferences like location, work type, and environment.

3. **Analyzes the Match**  
   Each job post is reviewed by AI to understand its requirements and estimate how well it aligns with your profile.

4. **Returns the Best Fits**  
   You receive a list of job posts that best match your skills, goals, and preferences — with a short explanation of why each was selected.

---

## ✅ Output

You’ll receive a list of job postings that match your profile, each including:

- Job title and company
- Location and link to the job post
- Summary of the job
- Reasons why it matches your profile
- Compatibility score or notes on alignment

---

## 📄 Example Output

```json
[
    {
        "jobPost": {
            "title": "Software Engineering Manager - Container and Virtualisation Infrastructure",
            "companyName": "Canonical",
            "location": "Prague, Prague, Czechia",
            "link": "https://cz.linkedin.com/jobs/view/software-engineering-manager-container-and-virtualisation-infrastructure-at-canonical-4243830670",
            "applyUrl": "https://grnh.se/f968d4bb1us"
        },
        "careerPathMatch": "Strong match. The candidate is interested in transitioning into a leadership role, aligning well with the opportunity to manage and develop a team at Canonical.",
        "locationMatch": "Strong match. Both the candidate and the job are located in Prague, Czechia.",
        "requirementsMatch": "Partial match. The candidate has a strong background in software development and experience as a frontend engineer, which indicates technical proficiency. However, specific experience with C and/or Go and leading engineering teams is not mentioned.",
        "experienceLevelMatch": "Potential match. The candidate is described as experienced, which could align with the mid-senior level, but specifics on experience in leading teams are not evident."
    }
]
```

---

## 🧩 Ideal For

- Job seekers looking for smarter LinkedIn job search
- Career changers wanting relevant opportunities
- Early-career professionals refining their job strategy

---

## 🚀 Powered by

- AI (GPT-4o by OpenAI)
- Apify’s LinkedIn job scraping tools
- Your career story

Just drop in your CV, fill in your preferences, and let the actor handle the smart search for you.
