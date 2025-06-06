# AI-Powered LinkedIn Job Matching Actor

This Apify actor uses AI to match job seekers with relevant LinkedIn job posts based on their CV, preferences, and career goals.

## 🧠 How It Works

The actor takes in structured user input including:

- **CV**: The candidate’s resume as raw text
- **Work Environment Preference**: e.g., hybrid, on-site, remote
- **Work Type**: e.g., full-time, part-time, contract
- **User Prompt**: A free-text description of the candidate’s career goals, aspirations, or specific preferences
- **Target Number of Results**: Number of job matches to return
- **Preferred Work Location**: A city/country name to find matching job openings (Please match the naming conventions on Linkedin)

### 🔄 Workflow

1. **GeoID Resolution**  
   The actor determines the correct LinkedIn `geoId` for the user's preferred work location.

2. **User Profile Analysis**  
   An AI agent analyzes the user's CV, career preferences, and constraints to create a structured candidate profile.

3. **Job Scraping**  
   The actor uses [`curious_coder/linkedin-jobs-scraper`](https://apify.com/curious_coder/linkedin-jobs-scraper) to scrape job postings from LinkedIn based on the user's criteria.

4. **Job Post Analysis**  
   Another AI agent analyzes each job post to summarize it, extract strict requirements, and describe its potential career path.

5. **Candidate-to-Job Matching**  
   A second AI agent compares each job post to the candidate profile and evaluates:
    - Job requirements match
    - Career path alignment
    - Experience level compatibility
    - Location match
    - Overall fit

Only job posts that pass the matching criteria are returned as results.

---

## 📦 Output

The actor returns a list of matched job posts with annotations describing why they fit the candidate profile.

---

## 🤖 Powered by

- Apify SDK
- OpenAI API (`gpt-4o`)
- Apify's `linkedin-jobs-scraper` actor
