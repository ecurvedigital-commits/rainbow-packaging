export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Rainbow Packages Reel Inventory API',
    version: '1.0.0',
    description: 'Backend REST API for tracking paper and board reels from purchase to use, with role-based access control, pending approvals, event history, and daily digest.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base URL',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token obtained from POST /auth/login. Send as Authorization: Bearer <token>',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'One or more fields are invalid.' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'reel_no' },
                    message: { type: 'string', example: 'Required' },
                  },
                },
              },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 25 },
          total: { type: 'integer', example: 125 },
          total_pages: { type: 'integer', example: 5 },
          totalPages: { type: 'integer', example: 5 },
          has_next_page: { type: 'boolean', example: true },
          hasNextPage: { type: 'boolean', example: true },
          has_previous_page: { type: 'boolean', example: false },
          hasPreviousPage: { type: 'boolean', example: false },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'System health and database status',
        tags: ['Health'],
        responses: {
          200: {
            description: 'Health status response',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    status: 'ok',
                    db: 'connected',
                    uptime_seconds: 1234,
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Log in with username and password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'Admin@12345' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful, returns access token and sets httpOnly refresh cookie' },
          401: { description: 'Invalid credentials' },
          403: { description: 'Account disabled' },
          423: { description: 'Account locked due to consecutive failures' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate session and get a new access token using httpOnly cookie',
        tags: ['Authentication'],
        responses: {
          200: { description: 'New access token returned' },
          401: { description: 'Token expired or invalid' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Sign out and revoke current session',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Signed out successfully' },
          401: { description: 'Unauthenticated' },
        },
      },
    },
    '/auth/logout-all': {
      post: {
        summary: 'Sign out of all sessions across devices',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Signed out everywhere' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get currently authenticated user profile',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user details' },
        },
      },
    },
    '/auth/change-password': {
      post: {
        summary: 'Change password for authenticated user',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['current_password', 'new_password'],
                properties: {
                  current_password: { type: 'string', example: 'Temp#12345' },
                  new_password: { type: 'string', example: 'MyNewPass@2026' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password changed successfully' },
          401: { description: 'Incorrect current password' },
          422: { description: 'Validation error' },
        },
      },
    },
    '/users': {
      post: {
        summary: 'Create a Supervisor or Operator account (Admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'username', 'role'],
                properties: {
                  name: { type: 'string', example: 'Suresh Chandra' },
                  username: { type: 'string', example: 'suresh.c' },
                  role: { type: 'string', enum: ['SUPERVISOR', 'OPERATOR'], example: 'SUPERVISOR' },
                  email: { type: 'string', format: 'email', example: 'suresh@example.com' },
                  phone: { type: 'string', example: '9876543210' },
                  password: { type: 'string', example: 'Optional@123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created' },
          409: { description: 'Duplicate username or email' },
          422: { description: 'Validation error' },
        },
      },
      get: {
        summary: 'List users with pagination and filtering (Admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'is_active', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25, maximum: 100 } },
        ],
        responses: {
          200: { description: 'List of users with pagination metadata' },
        },
      },
    },
    '/users/{id}': {
      get: {
        summary: 'Get user details by ID (Admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'User object' },
          404: { description: 'User not found' },
        },
      },
      patch: {
        summary: 'Update user profile and role (Admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  role: { type: 'string', enum: ['SUPERVISOR', 'OPERATOR'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated user' },
        },
      },
    },
    '/users/{id}/status': {
      patch: {
        summary: 'Activate or deactivate user account (Admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['is_active'],
                properties: { is_active: { type: 'boolean', example: false } },
              },
            },
          },
        },
        responses: {
          200: { description: 'User status updated' },
        },
      },
    },
    '/users/{id}/reset-password': {
      post: {
        summary: 'Reset user password (Admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password reset' },
        },
      },
    },
    '/users/{id}/unlock': {
      post: {
        summary: 'Unlock a locked user account (Admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'User account unlocked' },
        },
      },
    },
    '/reels': {
      get: {
        summary: 'List reels with multi-parameter filtering',
        tags: ['Reels'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'quality', in: 'query', schema: { type: 'string' } },
          { name: 'supplier', in: 'query', schema: { type: 'string' } },
          { name: 'gsm_min', in: 'query', schema: { type: 'number' } },
          { name: 'gsm_max', in: 'query', schema: { type: 'number' } },
          { name: 'size_min', in: 'query', schema: { type: 'number' } },
          { name: 'size_max', in: 'query', schema: { type: 'number' } },
          { name: 'weight_min', in: 'query', schema: { type: 'number' } },
          { name: 'weight_max', in: 'query', schema: { type: 'number' } },
          { name: 'purchase_date_from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'purchase_date_to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'station', in: 'query', schema: { type: 'string' } },
          { name: 'approval_status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25, maximum: 100 } },
          { name: 'sort', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Array of reel items with meta pagination' },
        },
      },
      post: {
        summary: 'Create a new physical reel (Operator & Admin)',
        tags: ['Reels'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reel_no', 'quality', 'bf', 'supplier_name', 'size', 'gsm', 'max_weight'],
                properties: {
                  reel_no: { type: 'string', example: '1004' },
                  quality: { type: 'string', example: 'VK' },
                  bf: { type: 'number', example: 18 },
                  purchase_date: { type: 'string', format: 'date', example: '2026-09-28' },
                  supplier_name: { type: 'string', example: 'Alpha Papers' },
                  size: { type: 'number', example: 100 },
                  gsm: { type: 'number', example: 150 },
                  max_weight: { type: 'number', example: 1000 },
                  custom_fields: { type: 'object', example: { thickness_micron: 80, batch_code: 'B-1' } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Reel created' },
          409: { description: 'Duplicate reel number' },
        },
      },
    },
    '/reels/search': {
      get: {
        summary: 'Quick lookup search for active reels by reel number prefix/substring',
        tags: ['Reels'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string', example: '100' } }],
        responses: {
          200: { description: 'Matching active reels array (up to 10)' },
        },
      },
    },
    '/reels/{id}': {
      get: {
        summary: 'Get single reel details',
        tags: ['Reels'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Reel object' },
          404: { description: 'Reel not found' },
        },
      },
      patch: {
        summary: 'Admin edit of reel fields (Admin only)',
        tags: ['Reels'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  gsm: { type: 'number' },
                  supplier_name: { type: 'string' },
                  max_weight: { type: 'number' },
                  previous_weight: { type: 'number' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Reel updated with ADMIN_CORRECTED event' },
        },
      },
    },
    '/reels/{id}/journey': {
      get: {
        summary: 'Timeline of all events on a reel',
        tags: ['Reels'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
        ],
        responses: {
          200: { description: 'Timeline events with decisions folded in and pagination metadata' },
        },
      },
    },
    '/reels/{id}/usage': {
      post: {
        summary: 'Record weight usage on a reel (Operator & Admin)',
        tags: ['Reels'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['station', 'current_weight_entered'],
                properties: {
                  station: { type: 'string', enum: ['Station 1', 'Station 2', 'Station 3'], example: 'Station 1' },
                  current_weight_entered: { type: 'number', example: 500 },
                  expected_previous_weight: { type: 'number', example: 800 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Usage recorded' },
          409: { description: 'Stale weight or pending events clash' },
        },
      },
    },
    '/reels/{id}/void': {
      post: {
        summary: 'Admin voids a reel from inventory (Admin only)',
        tags: ['Reels'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: { reason: { type: 'string', example: 'Entered by mistake' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Reel marked VOIDED' },
        },
      },
    },
    '/approvals/pending': {
      get: {
        summary: 'Approval queue for pending creation and usage entries (Supervisor & Admin)',
        tags: ['Approvals'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'event_type', in: 'query', schema: { type: 'string', enum: ['CREATED', 'USAGE_LOGGED'] } },
          { name: 'performed_by', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25, maximum: 100 } },
        ],
        responses: {
          200: { description: 'List of pending entries sorted oldest first' },
        },
      },
    },
    '/approvals/mine': {
      get: {
        summary: "Operator's submitted entries list (Operator & Admin)",
        tags: ['Approvals'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'DECLINED'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25, maximum: 100 } },
        ],
        responses: {
          200: { description: 'Entries submitted by current user' },
        },
      },
    },
    '/approvals/{eventId}/confirm': {
      post: {
        summary: 'Confirm a pending entry (Supervisor & Admin)',
        tags: ['Approvals'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'eventId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Entry confirmed' },
          403: { description: 'Self-approval not allowed' },
          409: { description: 'Already decided or out of order FIFO' },
        },
      },
    },
    '/approvals/{eventId}/decline': {
      post: {
        summary: 'Decline a pending entry with automatic revert and cascade (Supervisor & Admin)',
        tags: ['Approvals'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'eventId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { reason: { type: 'string', example: 'Weight looks wrong, please re-weigh' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Entry declined and reel balance reverted' },
        },
      },
    },
    '/notifications': {
      get: {
        summary: 'List in-app notifications for authenticated user',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'unread', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25, maximum: 100 } },
        ],
        responses: {
          200: { description: 'Notifications array' },
        },
      },
    },
    '/notifications/unread-count': {
      get: {
        summary: 'Get total unread notification count badge for user',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Unread count' },
        },
      },
    },
    '/notifications/read-all': {
      patch: {
        summary: 'Mark all notifications as read',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Count of updated notifications' },
        },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        summary: 'Mark single notification as read',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Updated notification' },
        },
      },
    },
    '/dashboard/summary': {
      get: {
        summary: 'Summary metric tiles for dashboard (Total reels, in stock, pending, aging)',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Summary tiles object' },
        },
      },
    },
    '/dashboard/status-board': {
      get: {
        summary: '3-column Kanban status board (REEL, CUT, NILL)',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit_per_column', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'quality', in: 'query', schema: { type: 'string' } },
          { name: 'supplier', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Categorized items by status' },
        },
      },
    },
    '/dashboard/breakdown': {
      get: {
        summary: 'Inventory weight breakdown grouped by quality or supplier',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'by', in: 'query', required: true, schema: { type: 'string', enum: ['quality', 'supplier'] } }],
        responses: {
          200: { description: 'Aggregated weight distribution' },
        },
      },
    },
    '/dashboard/aging': {
      get: {
        summary: 'Dead stock aging report for inactive reels',
        tags: ['Dashboard'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'min_days', in: 'query', schema: { type: 'integer' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25, maximum: 100 } },
        ],
        responses: {
          200: { description: 'Aging reels list' },
        },
      },
    },
    '/field-definitions': {
      get: {
        summary: 'List custom reel field definitions',
        tags: ['Field Definitions'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'active', in: 'query', schema: { type: 'string', enum: ['true', 'false', 'all'], default: 'true' } }],
        responses: {
          200: { description: 'Array of custom field definitions' },
        },
      },
      post: {
        summary: 'Create a new custom reel parameter definition (Admin only)',
        tags: ['Field Definitions'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['label', 'type'],
                properties: {
                  label: { type: 'string', example: 'Thickness (micron)' },
                  type: { type: 'string', enum: ['text', 'number'], example: 'number' },
                  key: { type: 'string', example: 'thickness_micron' },
                  required: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Field definition created' },
        },
      },
    },
    '/field-definitions/{id}': {
      patch: {
        summary: 'Update custom field definition (Admin only)',
        tags: ['Field Definitions'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  required: { type: 'boolean' },
                  order: { type: 'integer' },
                  is_active: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated field definition' },
        },
      },
    },
    '/audit/events': {
      get: {
        summary: 'Query system audit events log (Admin only)',
        tags: ['Audit & Digest'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'event_type', in: 'query', schema: { type: 'string' } },
          { name: 'approval_status', in: 'query', schema: { type: 'string' } },
          { name: 'performed_by', in: 'query', schema: { type: 'string' } },
          { name: 'reel_no', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25, maximum: 100 } },
        ],
        responses: {
          200: { description: 'Audit events log list' },
        },
      },
    },
    '/digest/preview': {
      get: {
        summary: 'Preview daily digest summary data without sending (Admin only)',
        tags: ['Audit & Digest'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
        responses: {
          200: { description: 'Digest preview counts and deep link' },
        },
      },
    },
    '/digest/send': {
      post: {
        summary: 'Trigger sending daily digest email immediately (Admin only)',
        tags: ['Audit & Digest'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  date: { type: 'string', format: 'date' },
                  force: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Digest sent and logged' },
        },
      },
    },
    '/digest/logs': {
      get: {
        summary: 'List daily digest execution logs (Admin only)',
        tags: ['Audit & Digest'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25, maximum: 100 } },
        ],
        responses: {
          200: { description: 'Digest logs' },
        },
      },
    },
    '/settings': {
      get: {
        summary: 'Get application settings (Admin only)',
        tags: ['Settings'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Settings object' },
        },
      },
      patch: {
        summary: 'Update application settings (Admin only)',
        tags: ['Settings'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  aging_threshold_days: { type: 'integer', minimum: 1, maximum: 365, example: 45 },
                  digest: {
                    type: 'object',
                    properties: {
                      enabled: { type: 'boolean', example: true },
                      time: { type: 'string', example: '19:30' },
                      timezone: { type: 'string', example: 'Asia/Kolkata' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated settings' },
        },
      },
    },
  },
};
