const certificationProfiles = [
  {
    id: "aws-saa",
    name: "AWS Certified Solutions Architect Associate",
    questionCount: 8,
    questionTypes: ["MULTIPLE_CHOICE", "TRICK"],
    includeDistractors: true,
  },
  {
    id: "aws-cloud-practitioner",
    name: "AWS Certified Cloud Practitioner",
    questionCount: 6,
    questionTypes: ["MULTIPLE_CHOICE", "FILL_IN_THE_BLANK"],
    includeDistractors: true,
  },
  {
    id: "general-certification",
    name: "General Certification Prep",
    questionCount: 5,
    questionTypes: ["MULTIPLE_CHOICE", "FILL_IN_THE_BLANK", "TRICK"],
    includeDistractors: true,
  },
];

module.exports = {
  certificationProfiles,
};
