import { z } from 'zod';
import { makeApiRequest } from '../utils/logger.js';
import { sessionStore } from '../utils/session.js';
import { SessionError } from '../errors/index.js';

const API_BASE_URL = 'https://apis.averbeporto.com.br/php/conn.php';

interface Document {
  id: string;
  UF: string;
  numDoc: string;
  serie: string;
  dtEmissao: string;
  valor: string;
  remetente: string;
  emitente: string;
  valido: string;
  placa: string | null;
  mData: string;
  vCarga: string;
  UFFim: string;
  dtRecbto: string;
  avb: string;
  ev: string;
  canc: string;
  protocolo: string;
}

interface RetrieveDocumentParams {
  sessionId: string;
  modDoc: number;
  dtStart: string;
  dtLimit: string;
  dtType?: number;
  numDoc?: string;
  emit?: string;
  rem?: string;
  exped?: string;
  receb?: string;
  dest?: string;
  toma?: string;
  importador?: string;
  representante?: string;
  page?: number;
  start?: number;
  limit?: number;
  prot?: string;
  taxId?: string;
  relation?: number;
  modal?: number;
  valid?: number;
}

export const retrieveDocumentTool = {
  name: 'retrieveDocument',
  description: 'Retrieves a list of electronic fiscal documents (NF-e, CT-e, MDF-e, Minuta CT-e) from the AverbePorto API based on specified filter criteria. Filters include document type, date range, date type (emission, update, send), document number (9 char max), involved parties (CNPJs), status, and more. Supports pagination. Requires an active `sessionId`.',
  inputSchema: {
    sessionId: z.string().describe('Session ID from login'),
    modDoc: z.enum(['DI', 'MDF-e', 'CT-e', 'NF-e', 'Minuta CT-e']).transform(value => {
      const mapping: { [key: string]: number } = {
        'DI': 49,
        'MDF-e': 58,
        'CT-e': 57,
        'NF-e': 55,
        'Minuta CT-e': 94
      };
      return mapping[value];
    }).describe('Document type identifier (e.g., CT-e, NF-e, MDF-e, Minuta CT-e)'),
    dtStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").describe('Start date in YYYY-MM-DD format'),
    dtLimit: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").describe('End date in YYYY-MM-DD format'),
    dtType: z.enum(['Update', 'Emission', 'Send']).transform(value => {
        const mapping: { [key: string]: number } = {
            'Update': 2,
            'Emission': 0,
            'Send': 1
        };
        return mapping[value];
    }).optional().default('Send').describe('Date type filter (Update, Emission, Send), default is Send (maps to 1)'),
    numDoc: z.string().optional().describe('Document number filter (9 char)'),
    emit: z.string().optional().describe('Emitter filter (CNPJ/CPF)'),
    rem: z.string().optional().describe('Remitter filter (CNPJ/CPF)'),
    exped: z.string().optional().describe('Expedition filter (CNPJ/CPF)'),
    receb: z.string().optional().describe('Reception filter (CNPJ/CPF)'),
    dest: z.string().optional().describe('Destination filter (CNPJ/CPF)'),
    toma: z.string().optional().describe('Taker filter (CNPJ/CPF)'),
    importador: z.string().optional().describe('Importer filter (CNPJ/CPF)'),
    representante: z.string().optional().describe('Representative filter (CNPJ/CPF)'),
    page: z.number().int().positive().optional().default(1).describe('Page number for pagination (starts at 1)'),
    start: z.number().int().nonnegative().optional().default(0).describe('Start index for pagination (0-based)'),
    limit: z.number().int().positive().optional().default(25).describe('Limit number of results per page'),
    prot: z.string().optional().describe('Protocol filter'),
    taxId: z.string().optional().describe('Tax ID filter (CNPJ/CPF, specific use case)'),
    relation: z.number().int().optional().default(0).describe('Relation parameter, default 0'),
    modal: z.enum(['All', 'Road', 'Air', 'Water', 'Rail', 'Pipeline', 'Multimodal']).transform(value => {
        const mapping: { [key: string]: number } = {
            'All': 0,
            'Road': 1,
            'Air': 2,
            'Water': 3,
            'Rail': 4,
            'Pipeline': 5,
            'Multimodal': 6
        };
        return mapping[value];
    }).optional().default('All').describe('Modal parameter, default All (maps to 0)'),
    valid: z.enum(['No', 'Yes', 'All']).transform(value => {
        const mapping: { [key: string]: number } = {
            'No': 0,
            'Yes': 1,
            'All': 2
        };
        return mapping[value];
    }).optional().default('All').describe('Valid parameter (document status), default All (maps to 2)'),
  },
  handler: async ({
    sessionId,
    modDoc,
    dtStart,
    dtLimit,
    dtType = 1,
    numDoc = '',
    emit = '',
    rem = '',
    exped = '',
    receb = '',
    dest = '',
    toma = '',
    importador = '',
    representante = '',
    page = 1,
    start = 0,
    limit = 25,
    prot = '',
    taxId = '',
    relation = 0,
    modal = 0,
    valid = 2
  }: RetrieveDocumentParams) => {
    const session = sessionStore.get(sessionId);
    if (!session) {
      throw new SessionError('Session not found or expired. Please login again.', sessionId);
    }

    const queryParams = new URLSearchParams();
    queryParams.append('comp', '5');
    queryParams.append('mod', 'Retrieve');
    queryParams.append('path', 'eguarda/php/');
    queryParams.append('act', 'ls');
    queryParams.append('modDoc', modDoc.toString());
    queryParams.append('relation', relation.toString());
    queryParams.append('prot', prot);
    queryParams.append('taxId', taxId);
    queryParams.append('dtType', dtType.toString());
    queryParams.append('dtStart', dtStart);
    queryParams.append('dtLimit', dtLimit);
    queryParams.append('modal', modal.toString());
    queryParams.append('valid', valid.toString());
    queryParams.append('numDoc', numDoc);
    queryParams.append('emit', emit);
    queryParams.append('rem', rem);
    queryParams.append('exped', exped);
    queryParams.append('receb', receb);
    queryParams.append('dest', dest);
    queryParams.append('toma', toma);
    queryParams.append('importador', importador);
    queryParams.append('representante', representante);
    queryParams.append('page', page.toString());
    queryParams.append('start', start.toString());
    queryParams.append('limit', limit.toString());

    const response = await makeApiRequest(
      API_BASE_URL,
      'POST',
      queryParams.toString(),
      {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': `portal[ses]=${session.cookie}`
      },
      'json'
    );

    // Check if body exists, is object and success flag is 1
    if (response.body && typeof response.body === 'object' && response.body.success === 1) {
      const docs = Array.isArray(response.body.S) ? response.body.S as Document[] : [];
      const totalCount = response.body.T || docs.length;

      const formattedDocs = docs.map((doc: Document) => ({
        id: doc.id,
        document: `${doc.numDoc}/${doc.serie}`,
        emissionDate: doc.dtEmissao,
        emitter: doc.emitente,
        sender: doc.remetente,
        value: doc.valor,
        status: {
          isValid: doc.valido === "1",
          isCancelled: doc.canc === "1",
          hasEvents: doc.ev === "1",
          isAverbado: doc.avb === "1"
        },
        route: {
          originUF: doc.UF,
          destinationUF: doc.UFFim
        },
        protocol: doc.protocolo,
        lastModified: doc.mData,
        receiptDate: doc.dtRecbto,
        vehiclePlate: doc.placa,
        cargoValue: doc.vCarga,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: `Document retrieval successful. Found ${docs.length} documents (Total available: ${totalCount}).\n` +
                  `Page: ${page}, Limit: ${limit}`
          }
        ],
        data: {
          success: 1,
          documents: formattedDocs,
          count: docs.length,
          total: totalCount,
          page: page,
          limit: limit,
          rawResponse: response.body
        }
      };
    } else {
      throw new Error('Document retrieval failed: Invalid response format');
    }
  }
};