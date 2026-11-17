import { ArrowRight } from 'lucide-react';
import type { Article, LawRule, PracticeArea } from '../types';

interface PracticeAreasViewProps {
  articles: Article[];
  rules: LawRule[];
  onFilterBriefings: (area: PracticeArea) => void;
  onFilterRules: (area: PracticeArea) => void;
}

const PRACTICE_DOSSIERS: {
  area: PracticeArea;
  heading: string;
  scope: string;
  keyStatutes: string;
}[] = [
  {
    area: 'Corporate',
    heading: 'Corporate Governance, Companies House & Insolvency',
    scope:
      'Covers Companies Act 2006 directors’ duties, Economic Crime and Corporate Transparency Act (ECCTA) identity verification and failure-to-prevent-fraud compliance, FRC Corporate Governance Code Provision 29, NSIA 2021 M&A notifications, and wrongful trading rules.',
    keyStatutes: 'CA 2006 · ECCTA 2023 · IA 1986 · NSIA 2021',
  },
  {
    area: 'Employment',
    heading: 'Employment Rights, Dismissal Codes & Workplace Duties',
    scope:
      'Covers unfair dismissal fairness under ERA 1996, the Statutory Code of Practice on Dismissal and Re-engagement (25% Tribunal uplift), the preventative duty against workplace sexual harassment (EqA s.40A), and TUPE transfer consultation obligations.',
    keyStatutes: 'ERA 1996 · TULRCA 1992 · EqA 2010 · SI 2006/246',
  },
  {
    area: 'Regulatory Compliance',
    heading: 'Financial Regulation, AML & UK Data Protection',
    scope:
      'Covers FCA Consumer Duty (PRIN 2A) board attestations, FSMA 2023 Critical Third Parties operational resilience, Bribery Act 2010 section 7 procedures, Money Laundering Regulations 2017 risk assessments, and UK GDPR / PECR enforcement.',
    keyStatutes: 'FSMA 2023 · Bribery Act 2010 · UK GDPR · SI 2017/692',
  },
  {
    area: 'Immigration & Sponsorship',
    heading: 'ILR, Skilled Worker & Care Worker Sponsorship Compliance',
    scope:
      'Covers Indefinite Leave to Remain (5-year Skilled Worker & 10-year Appendix Long Residence rules), rolling 180-day absence calculations, SOC 2020 going rates, mandatory CQC registration for Care Workers (SOC 6135/6136), displaced care worker pool priority, and UKVI Sponsor Management System duties.',
    keyStatutes: 'App. Skilled Worker · App. CR · App. LR · IANA 2006',
  },
];

export function PracticeAreasView({
  articles,
  rules,
  onFilterBriefings,
  onFilterRules,
}: PracticeAreasViewProps) {
  const published = articles.filter((a) => a.status === 'published');

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
      <div className="pb-8 border-b border-slate-200">
        <div className="text-xs font-semibold text-blue-900 mb-2">
          Editorial Desk Coverage
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-slate-900">
          UK Legal Practice Areas
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-3xl">
          Dedicated statutory tracking and practitioner commentary structured around core UK advisory disciplines.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10">
        {PRACTICE_DOSSIERS.map((dossier, idx) => {
          const areaArticles = published.filter((a) => a.practiceArea === dossier.area);
          const areaRules = rules.filter((r) => r.practiceArea === dossier.area);

          return (
            <section
              key={dossier.area}
              className="border border-slate-200 rounded-md p-6 sm:p-8 flex flex-col justify-between bg-white"
            >
              <div>
                <div className="flex items-center justify-between gap-4 text-xs text-slate-500 pb-3 border-b border-slate-100 mb-4">
                  <span className="font-semibold text-blue-900">
                    0{idx + 1}. {dossier.area}
                  </span>
                  <span className="font-mono tabular-nums">
                    {areaArticles.length} Briefings · {areaRules.length} Rules
                  </span>
                </div>

                <h2 className="font-editorial text-2xl font-semibold text-slate-900 mb-3">
                  {dossier.heading}
                </h2>

                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                  {dossier.scope}
                </p>

                <div className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded px-3 py-2 mb-6">
                  Core Instruments: {dossier.keyStatutes}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => onFilterBriefings(dossier.area)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                >
                  <span>Browse {dossier.area} Briefings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onFilterRules(dossier.area)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-blue-900 cursor-pointer"
                >
                  <span>View Statutory Rules</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
