export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ds-smartContract API',
    version: '1.0.0',
    description: 'REST API for on-chain hash storage and verification with cryptographic metadata commitments.'
  },
  servers: [
    { url: 'http://localhost:4000' },
    { url: 'https://ds-smartcontract1.onrender.com' },
    { url: 'https://66e32e51691b.ngrok-free.app' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      TokenRequest: {
        type: 'object',
        required: ['appid', 'appsecret'],
        properties: {
          appid: { type: 'string', example: 'demo-app' },
          appsecret: { type: 'string', example: 'demo-secret' }
        },
        example: {
          appid: 'demo-app',
          appsecret: 'demo-secret'
        }
      },
      TokenResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          tokenType: { type: 'string', example: 'Bearer' },
          expiresIn: { type: 'string', example: '15m' }
        },
        example: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          tokenType: 'Bearer',
          expiresIn: '15m'
        }
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
        example: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
        }
      },
      WriteSingleRequest: {
        type: 'object',
        required: ['hash'],
        properties: { 
          hash: { type: 'string', example: '0x56da8945af642a3e1635dc4a0e4a723458a29d1234567890abcdef1234567890' },
          metadata: { 
            type: 'object', 
            additionalProperties: true
          }
        },
        example: {
          hash: '0x56da8945af642a3e1635dc4a0e4a723458a29d1234567890abcdef1234567890',
          metadata: {
            name: 'John Doe',
            signature: 'abc123signature',
            date: '2023-01-01',
            documentId: 'doc-001',
            department: 'Engineering'
          }
        }
      },
      WriteBatchRequest: {
        type: 'object',
        required: ['hashes'],
        properties: {
          hashes: { 
            type: 'array', 
            items: { type: 'string' }
          },
          metadatas: {
            type: 'array',
            items: { type: 'object', additionalProperties: true }
          }
        },
        example: {
          hashes: [
            '0x56da8945af642a3e1635dc4a0e4a723458a29d1234567890abcdef1234567890',
            '0x9f87654321abcdef0123456789abcdef01234567890abcdef0123456789abcdef'
          ],
          metadatas: [
            {
              name: 'John Doe',
              signature: 'abc123signature',
              date: '2023-01-01',
              documentId: 'doc-001'
            },
            {
              name: 'Jane Smith',
              signature: 'def456signature',
              date: '2023-01-02',
              documentId: 'doc-002'
            }
          ]
        }
      },
      WriteResponse: {
        type: 'object',
        properties: {
          txHash: { type: 'string' },
          explorerUrl: { type: 'string' }
        },
        example: {
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          explorerUrl: 'https://sepolia.etherscan.io/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        }
      },
      VerifyRequest: {
        type: 'object',
        required: ['hash'],
        properties: {
          hash: { type: 'string', example: '0x56da8945af642a3e1635dc4a0e4a723458a29d1234567890abcdef1234567890' },
          metadata: { 
            type: 'string', 
            example: '{"name":"John Doe","signature":"abc123signature","date":"2023-01-01","documentId":"doc-001","department":"Engineering"}'
          }
        },
        example: {
          hash: '0x56da8945af642a3e1635dc4a0e4a723458a29d1234567890abcdef1234567890',
          metadata: '{"name":"John Doe","signature":"abc123signature","date":"2023-01-01","documentId":"doc-001","department":"Engineering"}'
        }
      },
      VerifySuccessResponse: {
        type: 'object',
        properties: {
          verified: { type: 'boolean', example: true }
        },
        example: { verified: true }
      },
      VerifyFailureResponse: {
        type: 'object',
        properties: {
          verified: { type: 'boolean', example: false },
          error: { type: 'string' },
          details: { type: 'string' }
        },
        example: {
          verified: false,
          error: 'metadata_changed',
          details: 'Metadata cryptographic commitment does not match stored commitment'
        }
      }
    }
  },
  security: [],
  paths: {
    '/auth/token': {
      post: {
        summary: 'Obtain access and refresh tokens',
        requestBody: { 
          required: true, 
          content: { 
            'application/json': { 
              schema: { $ref: '#/components/schemas/TokenRequest' }
            } 
          } 
        },
        responses: { 
          '200': { 
            description: 'OK', 
            content: { 
              'application/json': { 
                schema: { $ref: '#/components/schemas/TokenResponse' }
              } 
            } 
          }, 
          '401': { description: 'Invalid credentials' } 
        }
      }
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh tokens (rotation)',
        requestBody: { 
          required: true, 
          content: { 
            'application/json': { 
              schema: { $ref: '#/components/schemas/RefreshRequest' }
            } 
          } 
        },
        responses: { 
          '200': { 
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenResponse' }
              }
            }
          }, 
          '401': { description: 'Invalid refresh' } 
        }
      }
    },
    '/blockchain/write': {
      post: {
        summary: 'Store a single hash or a batch of hashes on-chain with metadata commitments',
        description: 'Stores cryptographic hashes and their metadata commitments on the blockchain. Client provides the hash and metadata, and the server computes and stores the cryptographic commitment.',
        security: [{ bearerAuth: [] }],
        requestBody: { 
          required: true, 
          content: { 
            'application/json': { 
              schema: {
                oneOf: [
                  { $ref: '#/components/schemas/WriteSingleRequest' },
                  { $ref: '#/components/schemas/WriteBatchRequest' }
                ]
              }
            } 
          } 
        },
        responses: { 
          '200': { 
            description: 'Transaction submitted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WriteResponse' }
              }
            }
          }, 
          '400': { description: 'Invalid input' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not owner' },
          '500': { description: 'Write failed' }
        }
      }
    },
    '/blockchain/verify': {
      get: {
        summary: 'Verify metadata against on-chain hash with cryptographic commitment comparison',
        description: 'Verify a hash exists on-chain and optionally compare metadata commitments. Client provides the hash and current metadata as query parameters, and the server compares the computed metadata commitment with the stored one.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { 
            name: 'hash', 
            in: 'query', 
            required: true, 
            schema: { $ref: '#/components/schemas/VerifyRequest/properties/hash' },
            description: 'Hash to verify' 
          },
          { 
            name: 'metadata', 
            in: 'query', 
            required: false, 
            schema: { $ref: '#/components/schemas/VerifyRequest/properties/metadata' },
            description: 'Current metadata for cryptographic comparison (as JSON string)' 
          }
        ],
        responses: { 
          '200': { 
            description: 'Verification result',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/VerifySuccessResponse' },
                    { $ref: '#/components/schemas/VerifyFailureResponse' }
                  ]
                }
              }
            }
          },
          '400': { description: 'Invalid input' },
          '401': { description: 'Unauthorized' },
          '500': { description: 'Verification failed' }
        }
      }
    }
  }
};