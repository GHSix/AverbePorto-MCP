import { z } from 'zod';
import { ValidationError } from '../errors/index.js';

interface DecomposeKeyParams {
  key: string;
}

export const decomposeKeyTool = {
  name: 'decomposeKey',
  description: 'Parses a 44-digit (infCte/Id) Brazilian electronic fiscal document access key (like NF-e, CT-e, MDF-e) into its individual components. Provides details such as state code, emission date, emitter CNPJ, document model, series, number, and emission type. This operation is performed locally without calling an external API.',
  inputSchema: {
    key: z.string()
         .describe('The access key for NF-e, CT-e, or MDF-e, which may include prefixes or suffixes'),
  },
  handler: async ({ key }: DecomposeKeyParams) => {
    // Extract only numeric digits from the input
    const numericKey = key.replace(/\D/g, '');

    // Validate that the numeric key is exactly 44 digits long
    if (numericKey.length !== 44) {
      throw new ValidationError(
        'Key must contain exactly 44 numeric digits after removing non-numeric characters.',
        'key',
        key
      );
    }

    // Structure of the 44-digit key:
    // cUF (2) + AAMM (4) + CNPJ (14) + mod (2) + serie (3) + nNF (9) + tpEmis (1) + cNF (8) + cDV (1) = 44

    const cUF = numericKey.substring(0, 2);
    const AAMM = numericKey.substring(2, 6);
    const CNPJ = numericKey.substring(6, 20);
    const mod = numericKey.substring(20, 22);
    const serie = numericKey.substring(22, 25);
    const nNF = numericKey.substring(25, 34);
    const tpEmis = numericKey.substring(34, 35);
    const cNF = numericKey.substring(35, 43);
    const cDV = numericKey.substring(43, 44);

    // --- Mappings for better readability ---
    const stateCodes: { [key: string]: string } = {
        '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
        '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', 
        '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR', 
        '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'
    };

    // --- Translated documentModels ---
    const documentModels: { [key: string]: string } = {
        '55': 'NF-e (Electronic Invoice)',
        '57': 'CT-e (Electronic Transport Document)',
        '58': 'MDF-e (Electronic Manifest of Fiscal Documents)',
        '65': 'NFC-e (Electronic Consumer Invoice)',
    };

    // --- Translated emissionTypes ---
    const emissionTypes: { [key: string]: string } = {
        '1': 'Normal',
        '2': 'Contingency FS-IA (Security Form for DANFE Printing)',
        '3': 'Contingency SCAN (National Environment Contingency System)',
        '4': 'Contingency DPEC (Prior Declaration of Emission in Contingency)',
        '5': 'Contingency FS-DA (Security Form for Auxiliary Document Printing)',
        '6': 'Contingency SVC-AN (Virtual SEFAZ Contingency - National Environment)',
        '7': 'Contingency SVC-RS (Virtual SEFAZ Contingency - Rio Grande do Sul)',
        '9': 'Offline Contingency (NF-e) / Special Regime NFF (NF-e)'
    };

    const decomposedData = {
      stateCode: cUF,
      stateUF: stateCodes[cUF] || 'Unknown',
      emissionYearMonth: AAMM, // YYMM format
      emitterTaxId: CNPJ,
      documentModelCode: mod,
      documentModelName: documentModels[mod] || 'Unknown Model',
      series: serie,
      documentNumber: nNF,
      emissionTypeCode: tpEmis,
      emissionTypeName: emissionTypes[tpEmis] || 'Unknown Type',
      numericCode: cNF,
      checkDigit: cDV,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully decomposed key:\n` +
                `State: ${decomposedData.stateUF} (${decomposedData.stateCode})\n` +
                `Emission Date (YYMM): ${decomposedData.emissionYearMonth}\n` +
                `Emitter CNPJ/CPF: ${decomposedData.emitterTaxId}\n` +
                `Model: ${decomposedData.documentModelName} (${decomposedData.documentModelCode})\n` +
                `Series: ${decomposedData.series}\n` +
                `Number: ${decomposedData.documentNumber}\n` +
                `Emission Type: ${decomposedData.emissionTypeName} (${decomposedData.emissionTypeCode})\n` +
                `Numeric Code: ${decomposedData.numericCode}\n` +
                `Check Digit: ${decomposedData.checkDigit}`
        }
      ],
      data: {
        success: 1,
        decomposition: decomposedData
      }
    };
  }
};