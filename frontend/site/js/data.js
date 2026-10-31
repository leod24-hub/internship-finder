/* Draft data for the front-end prototype. Replace with API calls later. */
window.LAN = (function () {
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const raw = [
    ["Software & IT", "blue", ["Software Engineering", "Cybersecurity", "IT & Support", "Mobile & Web Development", "Game Development"]],
    ["Data & AI", "blue", ["Data Science", "Machine Learning", "Data Analytics", "Data Engineering"]],
    ["Engineering", "blue", ["Mechanical", "Electrical", "Civil", "Chemical", "Aerospace", "Biomedical", "Industrial", "Materials"]],
    ["Product & Project Management", "blue", ["Product Management", "Project Management", "UX Research"]],
    ["Healthcare & Clinical", "teal", ["Clinical Care", "Public Health", "Health Administration", "Nursing & Allied Health", "Pharmacy", "Mental Health"]],
    ["Biotech & Life Sciences", "teal", ["Lab Research", "Biomanufacturing", "Regulatory & Quality", "Bioinformatics"]],
    ["Research & Labs", "teal", ["Undergraduate Research (REU)", "National Labs", "Academic Research", "Social Science Research"]],
    ["Social Sciences & Psychology", "teal", ["Psychology", "Sociology & Anthropology", "Economics Research"]],
    ["Finance & Accounting", "green", ["Accounting & Audit", "Corporate Finance", "Banking", "Investment & Asset Management", "Insurance & Risk"]],
    ["Environment & Sustainability", "green", ["Conservation", "Sustainability", "Environmental Science", "Climate & Policy"]],
    ["Energy & Utilities", "green", ["Renewable Energy", "Oil, Gas & Power", "Utilities"]],
    ["Agriculture & Food", "green", ["Agriculture", "Food Science", "Animal & Veterinary"]],
    ["Education", "yellow", ["Teaching & Tutoring", "Education Programs", "Higher Education Admin", "Education Technology"]],
    ["Architecture & Construction", "yellow", ["Architecture", "Construction Management", "Urban Planning", "Landscape Architecture"]],
    ["Real Estate", "yellow", ["Property Management", "Real Estate Investment", "Brokerage"]],
    ["Marketing & Advertising", "orange", ["Digital Marketing", "Brand & Content", "Market Research", "Public Relations"]],
    ["Sales & Customer Success", "orange", ["Business Development", "Account Management", "Customer Success"]],
    ["Hospitality & Events", "orange", ["Hotels & Lodging", "Events", "Restaurants & Food Service", "Travel & Tourism"]],
    ["Sports & Entertainment", "orange", ["Sports Management", "Entertainment & Media Production", "Gaming & Esports"]],
    ["Media & Communications", "rose", ["Journalism", "Broadcast & Video", "Publishing", "Social Media", "Communications"]],
    ["Nonprofit & Social Impact", "rose", ["Community Programs", "Advocacy", "Fundraising & Development", "International Development"]],
    ["Human Resources", "rose", ["Recruiting", "People Operations", "Learning & Development"]],
    ["Consulting", "purple", ["Management Consulting", "Technology Consulting", "Economic Consulting"]],
    ["Business & Management", "purple", ["Operations", "Strategy", "Entrepreneurship", "Supply Chain & Logistics"]],
    ["Design & Creative Arts", "purple", ["Graphic Design", "Product & UX Design", "Fashion", "Film & Photography", "Music & Performing Arts", "Fine Arts & Museums"]],
    ["Government & Policy", "slate", ["Federal Agencies", "State & Local", "Policy Analysis", "International Affairs", "Political Campaigns"]],
    ["Law & Legal", "slate", ["Law Firms", "Legal Aid", "Compliance", "Paralegal"]],
    ["Manufacturing & Supply Chain", "slate", ["Manufacturing", "Quality", "Procurement", "Logistics"]],
    ["Skilled Trades & Technical", "slate", ["Technical Operations", "Field Services"]],
  ];
  const categories = raw.map(([name, hue, subs]) => ({ id: slug(name), name, hue, subs: subs.map(s => ({ id: slug(name) + "-" + slug(s), name: s })) }));
  const byName = Object.fromEntries(categories.map(c => [c.name, c]));

  // [company, role, location, mode, category, type, pay, deadlineInDays, status, ats]
  const P = [
    ["Northwind Health", "Clinical Research Intern", "Boston, MA", "onsite", "Healthcare & Clinical", "Internship", "Paid", 4, "awaiting", "Workday"],
    ["Lumen Labs", "Software Engineering Intern", "Remote", "remote", "Software & IT", "Internship", "Paid", 18, "found", "Greenhouse"],
    ["Harbor Analytics", "Data Science Intern", "Chicago, IL", "hybrid", "Data & AI", "Internship", "Paid", 9, "found", "Lever"],
    ["Atlas Aerospace", "Mechanical Engineering Co-op", "Huntsville, AL", "onsite", "Engineering", "Co-op", "Paid", 25, "found", "iCIMS"],
    ["Civic Forward", "Policy Research Intern", "Washington, DC", "hybrid", "Government & Policy", "Internship", "Stipend", 2, "drafted", "Handshake"],
    ["Greenfield Energy", "Sustainability Intern", "Denver, CO", "hybrid", "Environment & Sustainability", "Internship", "Paid", 31, "found", "Greenhouse"],
    ["Brightpath Schools", "Education Programs Intern", "Austin, TX", "onsite", "Education", "Internship", "Unpaid", 15, "found", "Lever"],
    ["Meridian Media", "Editorial & Social Intern", "New York, NY", "hybrid", "Media & Communications", "Internship", "Paid", -3, "submitted", "Lever"],
    ["Studio Kite", "Product Design Intern", "Remote", "remote", "Design & Creative Arts", "Internship", "Paid", 21, "found", "Greenhouse"],
    ["Pioneer Biosciences", "Lab Research Intern", "San Diego, CA", "onsite", "Biotech & Life Sciences", "Internship", "Paid", -6, "interview", "Workday"],
    ["Summit Consulting Group", "Business Analyst Intern", "Atlanta, GA", "onsite", "Consulting", "Internship", "Paid", -9, "submitted", "Workday"],
    ["Open Hands Foundation", "Program Coordination Intern", "Portland, OR", "hybrid", "Nonprofit & Social Impact", "Internship", "Stipend", 12, "found", "Greenhouse"],
    ["Keystone Architects", "Architecture Intern", "Philadelphia, PA", "onsite", "Architecture & Construction", "Internship", "Paid", 6, "awaiting", "Ashby"],
    ["Evergreen Marketing Co.", "Marketing Intern", "Remote", "remote", "Marketing & Advertising", "Internship", "Paid", -12, "submitted", "Lever"],
    ["Coastline Hospitality", "Events & Guest Experience Intern", "Miami, FL", "onsite", "Hospitality & Events", "Internship", "Paid", 27, "found", "iCIMS"],
    ["Ledger & Co.", "Accounting Intern", "Minneapolis, MN", "hybrid", "Finance & Accounting", "Internship", "Paid", -15, "rejected", "iCIMS"],
  ];
  const postings = P.map((p, i) => ({ id: "p" + i, company: p[0], role: p[1], location: p[2], mode: p[3], category: p[4], hue: byName[p[4]].hue, type: p[5], pay: p[6], deadlineIn: p[7], status: p[8], ats: p[9] }));

  const schools = ["Arizona State University", "Boston University", "Georgia Tech", "Howard University", "Michigan State University", "Northeastern University", "Ohio State University", "Rutgers University", "Texas A&M University", "University of California, Berkeley", "University of Florida", "University of Illinois Urbana-Champaign", "University of Texas at Austin", "University of Washington"];
  // Suggestions only: the major field is free text, so any major works.
  const majors = ["Accounting", "Actuarial Science", "Advertising", "Aerospace Engineering", "African American Studies", "Agribusiness", "Agricultural Science", "American Studies", "Animal Science", "Anthropology", "Applied Mathematics", "Architecture", "Art", "Art History", "Asian Studies", "Astronomy", "Athletic Training", "Audiology", "Aviation", "Biochemistry", "Bioengineering", "Bioinformatics", "Biology", "Biomedical Engineering", "Biotechnology", "Business Administration", "Business Analytics", "Chemical Engineering", "Chemistry", "Child Development", "Chinese", "Cinema and Film Studies", "Civil Engineering", "Classics", "Cognitive Science", "Communication Disorders", "Communications", "Comparative Literature", "Computer Engineering", "Computer Science", "Construction Management", "Creative Writing", "Criminal Justice", "Criminology", "Culinary Arts", "Cybersecurity", "Dance", "Data Science", "Dental Hygiene", "Dietetics", "Digital Media", "Early Childhood Education", "Earth Science", "Economics", "Education", "Electrical Engineering", "Elementary Education", "Emergency Management", "Engineering Management", "English", "Entrepreneurship", "Environmental Engineering", "Environmental Science", "Environmental Studies", "Exercise Science", "Fashion Design", "Fashion Merchandising", "Film Production", "Finance", "Fine Arts", "Fire Science", "Food Science", "Foreign Languages", "Forensic Science", "Forestry", "French", "Gender and Sexuality Studies", "Geography", "Geology", "German", "Global Studies", "Graphic Design", "Health Administration", "Health Sciences", "History", "Hospitality Management", "Human Development", "Human Resources", "Industrial Design", "Industrial Engineering", "Information Systems", "Information Technology", "Interior Design", "International Business", "International Relations", "Italian", "Japanese", "Jewish Studies", "Journalism", "Kinesiology", "Labor Studies", "Landscape Architecture", "Latin American Studies", "Latino and Latina Studies", "Legal Studies", "Liberal Arts", "Library Science", "Linguistics", "Management", "Management Information Systems", "Marine Biology", "Marketing", "Materials Science", "Mathematics", "Mechanical Engineering", "Media Studies", "Medical Laboratory Science", "Microbiology", "Middle Eastern Studies", "Music", "Music Education", "Music Performance", "Native American Studies", "Neuroscience", "Nuclear Engineering", "Nursing", "Nutrition", "Occupational Therapy", "Operations Management", "Petroleum Engineering", "Pharmaceutical Sciences", "Pharmacy", "Philosophy", "Photography", "Physical Education", "Physical Therapy", "Physics", "Physiology", "Plant Science", "Political Science", "Pre-Law", "Pre-Med", "Pre-Vet", "Psychology", "Public Administration", "Public Health", "Public Policy", "Public Relations", "Radiologic Technology", "Real Estate", "Recreation and Leisure Studies", "Religious Studies", "Respiratory Therapy", "Russian", "Secondary Education", "Social Work", "Sociology", "Software Engineering", "Spanish", "Special Education", "Speech Pathology", "Sport Management", "Statistics", "Supply Chain Management", "Sustainability", "Theater", "Tourism Management", "Undecided", "Urban Planning", "Veterinary Technology", "Video Game Design", "Wildlife Biology", "Women's Studies", "Zoology"];

  return { categories, byName, postings, schools, majors, slug };
})();
