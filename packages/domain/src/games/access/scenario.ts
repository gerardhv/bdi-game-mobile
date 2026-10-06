import type { AccessOrgId } from './orgs.js'

export type LocaleText = { nl: string; en: string }

export const accessScenario = {
  association: {
    id: 'assoc-logistics',
    name: { nl: 'Logistiek Association', en: 'Logistics Association' } satisfies LocaleText,
  },
  organizations: {
    admin: {
      id: 'org-admin',
      name: { nl: 'Logistiek Association', en: 'Logistics Association' },
      roleLabel: { nl: 'Association Admin', en: 'Association Admin' },
      blurb: {
        nl: 'Behandelt eenmalige organisatie-onboarding en legt deelname vast in het Association Register.',
        en: 'Handles one-time organisation onboarding and records participation in the Association Register.',
      },
      color: '#1f6f8b',
      memberAtStart: true,
    },
    owner: {
      id: 'org-atlas',
      name: { nl: 'Verlader Atlas', en: 'Shipper Atlas' },
      roleLabel: { nl: 'Data Owner', en: 'Data Owner' },
      blurb: {
        nl: 'Legt eerst vast wie bij een transport betrokken is en gegevens mag ophalen, en bepaalt daarna welk beleid geldt.',
        en: 'First records who is involved in a transport and may retrieve data, then sets the applicable policy.',
      },
      color: '#c46b2c',
      memberAtStart: true,
    },
    provider: {
      id: 'org-logidata',
      name: { nl: 'LogiData', en: 'LogiData' },
      roleLabel: { nl: 'Data Service Provider', en: 'Data Service Provider' },
      blurb: {
        nl: 'Beoordeelt ieder verzoek met identiteit, deelname, vastgelegde betrokkenheid en het beleid van de Data Owner.',
        en: 'Judges each request with identity, participation, recorded involvement and the Data Owner policy.',
      },
      color: '#6b4c9a',
      memberAtStart: true,
    },
    consumer: {
      id: 'org-delta',
      name: { nl: 'Vervoerder Delta', en: 'Carrier Delta' },
      roleLabel: { nl: 'Data Consumer', en: 'Data Consumer' },
      blurb: {
        nl: 'Meldt de organisatie eenmalig aan, authenticeert per handeling en vraagt transportgegevens op.',
        en: 'Onboards the organisation once, authenticates per action and requests transport data.',
      },
      color: '#2e7d4f',
      memberAtStart: false,
    },
  } as Record<AccessOrgId, {
    id: string
    name: LocaleText
    roleLabel: LocaleText
    blurb: LocaleText
    color: string
    memberAtStart: boolean
  }>,
  deltaSystem: {
    id: 'sys-delta-planning',
    label: { nl: 'Planningsapplicatie Delta', en: 'Delta planning application' },
    endpoint: 'https://planning.delta.example/bdi',
    organizationId: 'org-delta',
  },
  credentials: {
    valid: {
      id: 'cred-valid',
      label: { nl: 'Geldig digitaal middel van organisatie Delta', en: 'Valid digital credential of organisation Delta' },
      status: 'active' as const,
      organizationId: 'org-delta',
    },
    expired: {
      id: 'cred-expired',
      label: { nl: 'Oud, verlopen digitaal middel van Delta', en: 'Old, expired digital credential of Delta' },
      status: 'expired' as const,
      organizationId: 'org-delta',
    },
  },
  transports: {
    'T-101': {
      id: 'T-101',
      carrierOrgId: null as string | null,
      loadInfo: {
        nl: 'Dock 4, twee pallets, laden tussen 11.00 en 12.00',
        en: 'Dock 4, two pallets, loading between 11:00 and 12:00',
      },
      financeInfo: {
        nl: 'Intern tarief €185, marge 12%',
        en: 'Internal rate €185, margin 12%',
      },
    },
    'T-102': {
      id: 'T-102',
      carrierOrgId: 'org-noord',
      carrierName: { nl: 'Vervoerder Noord', en: 'Carrier Noord' },
      loadInfo: {
        nl: 'Dock 7, één container, laden tussen 14.00 en 15.00',
        en: 'Dock 7, one container, loading between 14:00 and 15:00',
      },
    },
  },
  cards: {
    'load-T-101': {
      id: 'load-T-101',
      transportId: 'T-101',
      kind: 'loading' as const,
      title: { nl: 'Laadinformatie T-101', en: 'Loading info T-101' },
    },
    'finance-T-101': {
      id: 'finance-T-101',
      transportId: 'T-101',
      kind: 'finance' as const,
      title: { nl: 'Financiële gegevens T-101', en: 'Financial data T-101' },
    },
    'load-T-102': {
      id: 'load-T-102',
      transportId: 'T-102',
      kind: 'loading' as const,
      title: { nl: 'Laadinformatie T-102', en: 'Loading info T-102' },
    },
  },
  dossierCards: [
    { id: 'org-identity', label: { nl: 'Organisatie-identiteit Delta', en: 'Organisation identity Delta' } },
    { id: 'representative', label: { nl: 'Bevoegdheid van de vertegenwoordiger', en: 'Authority of the representative' } },
    { id: 'terms', label: { nl: 'Aanvaarding van de deelnamevoorwaarden', en: 'Acceptance of participation terms' } },
  ],
  systemChecks: [
    { id: 'belongs', label: { nl: 'Systeem hoort bij Delta', en: 'System belongs to Delta' } },
    { id: 'endpoint', label: { nl: 'Endpoint bevestigd', en: 'Endpoint confirmed' } },
    { id: 'credential', label: { nl: 'Digitaal middel gekoppeld', en: 'Digital credential linked' } },
  ],
  debriefQuestions: [
    {
      nl: 'Waarom is onboarding een eenmalige stap, terwijl authenticatie en toegangsbeslissing per handeling herhalen?',
      en: 'Why is onboarding a one-time step while authentication and access decisions repeat for every action?',
    },
    {
      nl: 'Waarom legde de Data Owner eerst vast wie gegevens mag ophalen, vóórdat de Data Service Provider toegang beoordeelde?',
      en: 'Why did the Data Owner first record who may retrieve data before the Data Service Provider judged access?',
    },
    {
      nl: 'Welk verschil zagen we tussen BVAD (deelname) en BVOD (betrokkenheid bij dit transport)?',
      en: 'What difference did we see between BVAD (participation) and BVOD (involvement in this transport)?',
    },
    {
      nl: 'Wie bepaalde het beleid en wie paste het toe bij ieder verzoek?',
      en: 'Who set the policy and who applied it on each request?',
    },
    {
      nl: 'Waarom kreeg dezelfde geauthenticeerde partij verschillende antwoorden op drie gegevensvragen zonder opnieuw te onboarden?',
      en: 'Why did the same authenticated party get different answers to three data requests without onboarding again?',
    },
  ],
  termCards: [
    {
      term: 'Identification',
      nl: 'Een organisatie of systeem presenteert een identiteit. Het noemen van een naam of nummer bewijst die identiteit nog niet.',
      en: 'An organisation or system presents an identity. Naming a name or number does not yet prove that identity.',
    },
    {
      term: 'Onboarding',
      nl: 'Eenmalige toelating van de organisatie (dossier → BVAD). Geen automatisch leesrecht op transportgegevens en geen aparte applicatieregistratie in deze oefening.',
      en: 'One-time admission of the organisation (dossier → BVAD). No automatic read right on transport data and no separate application registration in this exercise.',
    },
    {
      term: 'Authentication',
      nl: 'Controleren dat het systeem bij het actuele verzoek zijn geclaimde digitale identiteit met geldig bewijs gebruikt.',
      en: 'Checking that the system uses its claimed digital identity with valid proof for the current request.',
    },
    {
      term: 'Authorization',
      nl: 'Beslissen of deze aanvrager de gevraagde gegevens onder de huidige voorwaarden mag gebruiken.',
      en: 'Deciding whether this requester may use the requested data under the current conditions.',
    },
    {
      term: 'Association Register',
      nl: 'Registratie van deelnemende organisaties, hun status en relaties met systemen, credentials en endpoints.',
      en: 'Registration of participating organisations, their status and relations with systems, credentials and endpoints.',
    },
    {
      term: 'BVAD',
      nl: 'BDI Verifiable Association Data: controleerbaar bewijs van Association-deelname en status.',
      en: 'BDI Verifiable Association Data: verifiable proof of Association participation and status.',
    },
    {
      term: 'Orchestration Registry',
      nl: 'Registratie van welke partijen in welke rol betrokken zijn bij een specifiek transport.',
      en: 'Registration of which parties hold which role for a specific transport.',
    },
    {
      term: 'BVOD',
      nl: 'BDI Verifiable Orchestration Data: controleerbaar bewijs van betrokkenheid en rol binnen die operationele context.',
      en: 'BDI Verifiable Orchestration Data: verifiable proof of involvement and role in that operational context.',
    },
    {
      term: 'BDI Connector',
      nl: 'Verwerkt bewijzen en ondersteunt de lokale toegangsbeslissing (PDP) en handhaving (PEP). Het beleid blijft van de Data Owner.',
      en: 'Processes proofs and supports the local access decision (PDP) and enforcement (PEP). Policy remains with the Data Owner.',
    },
  ],
} as const

export type CardId = keyof typeof accessScenario.cards
