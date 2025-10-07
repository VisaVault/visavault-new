export type VisaType =
  | 'H1B'
  | 'Marriage-Green-Card'
  | 'K1-Fiance'
  | 'Removal-of-Conditions'
  | 'Immigrant-Spouse'
  | 'Green-Card';

export type EvidenceItem = {
  id: string;
  title: string;
  description?: string;
  required: boolean;
  accepts?: string[];
  needsLanguageChoice?: boolean;
  requiresTranslationIfNotEnglish?: boolean;
};

export type UseCaseConfig = {
  title: string;
  coreForms: string[];
  evidence: EvidenceItem[];
  generationGates: {
    requiredEvidenceIds: string[];
    requiredInputs: string[];
  };
  recommendedNotes?: string[];
};

export const USE_CASES: Record<VisaType, UseCaseConfig> = {
  'Marriage-Green-Card': {
    title: 'Marriage Green Card',
    coreForms: ['I-130 (Petition)', 'I-485 (Adjustment)', 'I-864 (Affidavit of Support)', 'I-693 (Medical)'],
    evidence: [
      { id: 'ids-passports', title: 'Passports / Government IDs', description: 'If not in English, add certified translation.', required: true, accepts: ['pdf','jpg','png'], needsLanguageChoice: true, requiresTranslationIfNotEnglish: true },
      { id: 'marriage-certificate', title: 'Marriage Certificate', description: 'Certified copy. Translate if needed.', required: true, accepts: ['pdf','jpg','png'], needsLanguageChoice: true, requiresTranslationIfNotEnglish: true },
      { id: 'proof-bona-fide', title: 'Proof of Bona Fide Marriage', description: 'Joint lease/mortgage, bank statements, insurance, photos with captions.', required: true, accepts: ['pdf','jpg','png'] },
      { id: 'affidavits-friends', title: 'Affidavits from Friends/Family', description: 'Name, address, status, relationship, anecdotes with dates.', required: false, accepts: ['pdf','docx'] },
      { id: 'i864-income', title: 'I-864 Income Evidence', description: 'Taxes (3y), W-2s, pay stubs, employment letter, assets.', required: true, accepts: ['pdf'] },
    ],
    generationGates: {
      requiredEvidenceIds: ['ids-passports','marriage-certificate','proof-bona-fide','i864-income'],
      requiredInputs: ['sponsorIncome','householdSize','petitionerName','beneficiaryName'],
    },
    recommendedNotes: ['Add 10+ photos with captions (date/place/people).','Include 2–3 affidavits for extra strength.'],
  },
  'K1-Fiance': {
    title: 'K-1 Fiancé(e)',
    coreForms: ['I-129F (Petition)'],
    evidence: [
      { id: 'meeting-proof', title: 'Proof of In-Person Meeting (last 2 yrs)', required: true, accepts: ['pdf','jpg','png'] },
      { id: 'intent-to-marry', title: 'Intent to Marry Letters (both)', required: true, accepts: ['pdf','docx'] },
      { id: 'relationship-evidence', title: 'Relationship Evidence', required: false, accepts: ['pdf','jpg','png'] },
      { id: 'identity-docs', title: 'Identity Documents', required: true, accepts: ['pdf','jpg','png'], needsLanguageChoice: true, requiresTranslationIfNotEnglish: true },
    ],
    generationGates: {
      requiredEvidenceIds: ['meeting-proof','intent-to-marry','identity-docs'],
      requiredInputs: ['petitionerName','beneficiaryName','dateOfMeeting'],
    },
  },
  'Removal-of-Conditions': {
    title: 'Removal of Conditions (I-751)',
    coreForms: ['I-751'],
    evidence: [
      { id: 'joint-docs', title: 'Joint Docs Since Marriage', required: true, accepts: ['pdf','jpg','png'] },
      { id: 'children-birth-cert', title: 'Children’s Birth Certificates (if any)', required: false, accepts: ['pdf','jpg','png'], needsLanguageChoice: true, requiresTranslationIfNotEnglish: true },
      { id: 'affidavits-friends-roc', title: 'Affidavits from Friends/Family', required: false, accepts: ['pdf','docx'] },
    ],
    generationGates: {
      requiredEvidenceIds: ['joint-docs'],
      requiredInputs: ['petitionerName','beneficiaryName'],
    },
  },
  'Immigrant-Spouse': {
    title: 'Immigrant Spouse',
    coreForms: ['I-130','I-485 (if adjusting in U.S.)','I-864'],
    evidence: [
      { id: 'marriage-certificate', title: 'Marriage Certificate', required: true, accepts: ['pdf','jpg','png'], needsLanguageChoice: true, requiresTranslationIfNotEnglish: true },
      { id: 'bona-fide', title: 'Bona Fide Marriage Evidence', required: true, accepts: ['pdf','jpg','png'] },
      { id: 'petitioner-status', title: 'Petitioner Proof of Status', required: true, accepts: ['pdf','jpg','png'] },
      { id: 'i864-income', title: 'I-864 Income Evidence', required: true, accepts: ['pdf'] },
    ],
    generationGates: {
      requiredEvidenceIds: ['marriage-certificate','bona-fide','petitioner-status','i864-income'],
      requiredInputs: ['sponsorIncome','householdSize','petitionerName','beneficiaryName'],
    },
  },
  'Green-Card': {
    title: 'Employment-Based Green Card',
    coreForms: ['I-140','I-485 (when eligible)'],
    evidence: [
      { id: 'degrees', title: 'Degrees & Evaluations', required: true, accepts: ['pdf'] },
      { id: 'experience-letters', title: 'Experience Letters', required: true, accepts: ['pdf','docx'] },
      { id: 'employer-letter', title: 'Employer Support Letter', required: true, accepts: ['pdf','docx'] },
      { id: 'translations', title: 'Translations (if needed)', required: false, accepts: ['pdf'] },
    ],
    generationGates: {
      requiredEvidenceIds: ['degrees','experience-letters','employer-letter'],
      requiredInputs: ['petitionerName','beneficiaryName','category'],
    },
  },
  'H1B': {
    title: 'H-1B Specialty Occupation',
    coreForms: ['LCA (DOL)','I-129'],
    evidence: [
      { id: 'lca', title: 'LCA Approval', required: true, accepts: ['pdf'] },
      { id: 'soc-wage', title: 'SOC Code & Wage Level', required: true, accepts: ['pdf','docx'] },
      { id: 'degree-eval', title: 'Degree Transcripts/Evaluations', required: true, accepts: ['pdf'], needsLanguageChoice: true, requiresTranslationIfNotEnglish: true },
      { id: 'employer-letter', title: 'Employer Support Letter (duties)', required: true, accepts: ['pdf','docx'] },
      { id: 'client-letter', title: 'Client Letter/SOW (if third-party)', required: false, accepts: ['pdf','docx'] },
    ],
    generationGates: {
      requiredEvidenceIds: ['lca','soc-wage','degree-eval','employer-letter'],
      requiredInputs: ['employerName','socCode','wageLevel','petitionerName','beneficiaryName'],
    },
  },
};

export function visaTypeFromSlug(slug: string) {
  return (Object.keys(USE_CASES) as (keyof typeof USE_CASES)[]).find((k) => k === slug) || null;
}