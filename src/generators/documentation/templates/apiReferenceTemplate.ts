export function renderApiReference(): string {
  return `# API Reference

**Purpose:** Enable AI agents to programmatically interact with all API endpoints.

**Agent Usage Instructions:**
- Use documented curl commands as templates for requests
- Verify expected response codes match actual responses
- Handle authentication token expiration automatically
- Parse error responses to determine retry strategy
- Log all API interactions for debugging

## Base URLs

**Agent Configuration:**
\`\`\`bash
# Set as environment variables for easier switching
export API_BASE_DEV="http://localhost:3000/api"
export API_BASE_STAGING="https://staging-api.example.com"  # TODO: Update
export API_BASE_PROD="https://api.example.com"              # TODO: Update

# Agent uses based on context
API_BASE=$API_BASE_STAGING  # Change as needed
\`\`\`

## Authentication

**Agent Authentication Flow:**

### Step 1: Obtain Token
\`\`\`bash
# Agent executes login
TOKEN_RESPONSE=$(curl -s -X POST "\${API_BASE}/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "agent@example.com",
    "password": "'\${AGENT_PASSWORD}'"
  }')

# Agent extracts token
TOKEN=$(echo \$TOKEN_RESPONSE | jq -r '.token')
EXPIRES_IN=$(echo \$TOKEN_RESPONSE | jq -r '.expiresIn')

# Agent stores token with expiration
echo "\$TOKEN" > .api-token
echo \$((\$(date +%s) + \$EXPIRES_IN)) > .api-token-expires

# Expected response structure
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "expiresIn": 3600,
#   "refreshToken": "refresh_token_here",
#   "user": {"id": "123", "email": "agent@example.com"}
# }
\`\`\`

### Step 2: Use Token in Requests
\`\`\`bash
# Agent includes token in all authenticated requests
curl -X GET "\${API_BASE}/resources" \\
  -H "Authorization: Bearer \$TOKEN" \\
  -H "Content-Type: application/json"
\`\`\`

### Step 3: Handle Token Expiration
\`\`\`bash
# Agent checks token expiration before each request
function check_token() {
  if [ ! -f .api-token ] || [ ! -f .api-token-expires ]; then
    return 1  # Token missing, need to authenticate
  fi

  EXPIRES=$(cat .api-token-expires)
  NOW=$(date +%s)

  if [ $NOW -ge $EXPIRES ]; then
    return 1  # Token expired
  fi

  return 0  # Token valid
}

# Agent refresh flow (if 401 received)
if ! check_token; then
  echo "Token expired or missing, re-authenticating..."
  # Re-run Step 1
fi
\`\`\`

**Agent Error Handling:**
- 401 response → Token invalid/expired, re-authenticate
- 403 response → Permission denied, check agent has required role
- 429 response → Rate limited, wait and retry (see Rate Limiting section)

### Authorization & Permissions
- Document role-based access control (RBAC) if applicable
- List permission levels and their capabilities
- Explain scope-based authorization for OAuth

## API Versioning
- **Current Version:** v1
- **Versioning Strategy:** TODO: URL path (/v1/), header, or query parameter
- **Deprecation Policy:** TODO: Document how versions are deprecated

## Rate Limiting

**Agent Must Implement:** Check rate limit headers and back off when necessary.

\`\`\`bash
# Agent rate limit handler
function make_api_request() {
  local url=$1
  local method=$2
  local data=$3

  RESPONSE=$(curl -i -X "$method" "$url" \\
    -H "Authorization: Bearer $TOKEN" \\
    -H "Content-Type: application/json" \\
    -d "$data" 2>&1)

  # Agent extracts rate limit headers
  LIMIT=$(echo "$RESPONSE" | grep -i "x-ratelimit-limit" | cut -d: -f2 | tr -d ' \\r')
  REMAINING=$(echo "$RESPONSE" | grep -i "x-ratelimit-remaining" | cut -d: -f2 | tr -d ' \\r')
  RESET=$(echo "$RESPONSE" | grep -i "x-ratelimit-reset" | cut -d: -f2 | tr -d ' \\r')

  # Agent checks if approaching limit
  if [ "\$REMAINING" -lt "10" ]; then
    NOW=$(date +%s)
    WAIT=\$((RESET - NOW))
    echo "Rate limit low (\$REMAINING remaining), waiting \${WAIT}s until reset..."
    sleep \$WAIT
  fi

  # Agent handles 429 (rate limited)
  HTTP_CODE=$(echo "\$RESPONSE" | grep "HTTP/" | awk '{print \$2}')
  if [ "\$HTTP_CODE" == "429" ]; then
    RETRY_AFTER=$(echo "\$RESPONSE" | grep -i "retry-after" | cut -d: -f2 | tr -d ' \\r')
    echo "Rate limited, retrying after \${RETRY_AFTER}s..."
    sleep "\$RETRY_AFTER"
    make_api_request "\$url" "\$method" "\$data"  # Retry
  fi

  echo "$RESPONSE"
}
\`\`\`

**Rate Limit:** TODO: e.g., 1000 requests per hour
**Headers Agent Should Monitor:**
- \`X-RateLimit-Limit\`: Maximum allowed
- \`X-RateLimit-Remaining\`: Remaining in window
- \`X-RateLimit-Reset\`: Reset time (Unix timestamp)
- \`Retry-After\`: Seconds to wait (when 429 received)

## Common Headers
### Request Headers
- \`Content-Type: application/json\` - Required for POST/PUT/PATCH
- \`Authorization: Bearer <token>\` - Authentication token
- \`X-Request-ID: <uuid>\` - Optional request tracking ID

### Response Headers
- \`Content-Type: application/json\`
- \`X-Request-ID: <uuid>\` - Echo of request ID for tracking
- \`X-Response-Time: <ms>\` - Server processing time

## Endpoints

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
\`\`\`

**Response (201 Created):**
\`\`\`json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-15T10:30:00Z"
}
\`\`\`

**Errors:**
- \`400\`: Validation error (invalid email, weak password)
- \`409\`: Email already registered

---

#### POST /auth/login
Authenticate user and receive access token.

**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
\`\`\`

**Response (200 OK):**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "expiresIn": 3600,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
\`\`\`

**Errors:**
- \`401\`: Invalid credentials
- \`429\`: Too many failed attempts

---

### Resource Endpoints

#### GET /api/resources
List all resources with pagination.

**Query Parameters:**
- \`page\` (integer, default: 1): Page number
- \`limit\` (integer, default: 20, max: 100): Items per page
- \`sort\` (string): Sort field (e.g., "createdAt", "-name" for desc)
- \`filter\` (string): Filter criteria (implementation-specific)

**Response (200 OK):**
\`\`\`json
{
  "data": [
    {
      "id": "res_123",
      "name": "Resource Name",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
\`\`\`

**Errors:**
- \`401\`: Unauthorized (missing or invalid token)
- \`403\`: Forbidden (insufficient permissions)

---

#### GET /api/resources/:id
Get a specific resource by ID.

**Path Parameters:**
- \`id\` (string, required): Resource identifier

**Response (200 OK):**
\`\`\`json
{
  "id": "res_123",
  "name": "Resource Name",
  "description": "Detailed description",
  "status": "active",
  "metadata": {
    "key": "value"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
\`\`\`

**Errors:**
- \`401\`: Unauthorized
- \`404\`: Resource not found

---

#### POST /api/resources
Create a new resource.

**Request:**
\`\`\`json
{
  "name": "New Resource",
  "description": "Resource description",
  "status": "active",
  "metadata": {
    "key": "value"
  }
}
\`\`\`

**Response (201 Created):**
\`\`\`json
{
  "id": "res_124",
  "name": "New Resource",
  "description": "Resource description",
  "status": "active",
  "metadata": {
    "key": "value"
  },
  "createdAt": "2024-01-15T11:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
\`\`\`

**Errors:**
- \`400\`: Validation error
- \`401\`: Unauthorized
- \`403\`: Forbidden

---

#### PUT /api/resources/:id
Update an existing resource (full replacement).

**Path Parameters:**
- \`id\` (string, required): Resource identifier

**Request:**
\`\`\`json
{
  "name": "Updated Resource",
  "description": "Updated description",
  "status": "inactive",
  "metadata": {
    "key": "newValue"
  }
}
\`\`\`

**Response (200 OK):**
Returns updated resource object.

**Errors:**
- \`400\`: Validation error
- \`401\`: Unauthorized
- \`404\`: Resource not found

---

#### PATCH /api/resources/:id
Partially update a resource.

**Path Parameters:**
- \`id\` (string, required): Resource identifier

**Request:**
\`\`\`json
{
  "status": "inactive"
}
\`\`\`

**Response (200 OK):**
Returns updated resource object.

---

#### DELETE /api/resources/:id
Delete a resource.

**Path Parameters:**
- \`id\` (string, required): Resource identifier

**Response (204 No Content)**

**Errors:**
- \`401\`: Unauthorized
- \`404\`: Resource not found
- \`409\`: Conflict (resource has dependencies)

---

## Webhooks
### Registering Webhooks
Document webhook registration process if applicable.

### Webhook Events
- \`resource.created\` - Fired when a new resource is created
- \`resource.updated\` - Fired when a resource is updated
- \`resource.deleted\` - Fired when a resource is deleted

### Webhook Payload Example
\`\`\`json
{
  "event": "resource.created",
  "timestamp": "2024-01-15T11:00:00Z",
  "data": {
    "id": "res_124",
    "name": "New Resource"
  }
}
\`\`\`

### Webhook Security
- Document signature verification mechanism
- Explain retry logic for failed deliveries

## Error Responses
### Standard Error Format
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "requestId": "req_abc123"
  }
}
\`\`\`

### HTTP Status Codes
- \`200 OK\`: Successful request
- \`201 Created\`: Resource created successfully
- \`204 No Content\`: Successful deletion
- \`400 Bad Request\`: Invalid input or validation error
- \`401 Unauthorized\`: Missing or invalid authentication
- \`403 Forbidden\`: Insufficient permissions
- \`404 Not Found\`: Resource not found
- \`409 Conflict\`: Resource conflict (duplicate, dependencies)
- \`422 Unprocessable Entity\`: Valid syntax but semantic errors
- \`429 Too Many Requests\`: Rate limit exceeded
- \`500 Internal Server Error\`: Server error
- \`503 Service Unavailable\`: Service temporarily unavailable

### Common Error Codes
- \`VALIDATION_ERROR\`: Input validation failed
- \`AUTHENTICATION_REQUIRED\`: No authentication provided
- \`AUTHENTICATION_FAILED\`: Invalid credentials
- \`PERMISSION_DENIED\`: Insufficient permissions
- \`RESOURCE_NOT_FOUND\`: Requested resource doesn't exist
- \`RATE_LIMIT_EXCEEDED\`: Too many requests
- \`INTERNAL_ERROR\`: Server-side error

## SDK & Client Libraries
- Document available SDKs (JavaScript, Python, Ruby, etc.)
- Link to SDK documentation and examples

## Postman/OpenAPI Collection
- Link to Postman collection for easy testing
- Link to OpenAPI/Swagger specification if available
`;
}