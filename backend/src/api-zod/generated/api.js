import * as zod from "zod";
const HealthCheckResponse = zod.object({
  status: zod.string()
});
const LoginBody = zod.object({
  identifier: zod.string().describe("Email address or Employee ID"),
  password: zod.string()
});
const LoginResponse = zod.object({
  accessToken: zod.string(),
  refreshToken: zod.string(),
  user: zod.object({
    id: zod.number(),
    employeeId: zod.string().nullish(),
    name: zod.string(),
    email: zod.string(),
    role: zod.enum(["super_admin", "developer", "tester", "client"]),
    subType: zod.string().nullish(),
    designation: zod.string().nullish(),
    avatarUrl: zod.string().nullish(),
    department: zod.string().optional(),
    phoneNumber: zod.string().nullish(),
    joiningDate: zod.string().nullish(),
    linkedinUrl: zod.string().nullish(),
    status: zod.enum(["active", "inactive", "suspended"]),
    lastLoginAt: zod.string().nullish(),
    createdAt: zod.string()
  })
});
const RefreshTokenBody = zod.object({
  refreshToken: zod.string()
});
const RefreshTokenResponse = zod.object({
  accessToken: zod.string(),
  refreshToken: zod.string(),
  user: zod.object({
    id: zod.number(),
    employeeId: zod.string().nullish(),
    name: zod.string(),
    email: zod.string(),
    role: zod.enum(["super_admin", "developer", "tester", "client"]),
    subType: zod.string().nullish(),
    designation: zod.string().nullish(),
    avatarUrl: zod.string().nullish(),
    department: zod.string().optional(),
    phoneNumber: zod.string().nullish(),
    joiningDate: zod.string().nullish(),
    linkedinUrl: zod.string().nullish(),
    status: zod.enum(["active", "inactive", "suspended"]),
    lastLoginAt: zod.string().nullish(),
    createdAt: zod.string()
  })
});
const ForgotPasswordBody = zod.object({
  email: zod.string()
});
const ResetPasswordBody = zod.object({
  token: zod.string(),
  newPassword: zod.string()
});
const ListTicketsQueryParams = zod.object({
  status: zod.coerce.string().optional(),
  priority: zod.coerce.string().optional(),
  projectId: zod.coerce.number().optional(),
  search: zod.coerce.string().optional(),
  page: zod.coerce.number().optional(),
  limit: zod.coerce.number().optional()
});
const ListTicketsResponse = zod.object({
  tickets: zod.array(
    zod.object({
      id: zod.number(),
      projectId: zod.number().nullish(),
      projectName: zod.string().nullish(),
      creatorId: zod.number(),
      creatorName: zod.string().optional(),
      assignedTo: zod.number().nullish(),
      assigneeName: zod.string().nullish(),
      title: zod.string(),
      description: zod.string(),
      status: zod.enum(["open", "pending", "resolved", "closed"]),
      priority: zod.enum(["low", "medium", "high", "urgent"]),
      attachments: zod.array(zod.string()).optional(),
      createdAt: zod.string(),
      updatedAt: zod.string()
    })
  ),
  total: zod.number(),
  page: zod.number(),
  limit: zod.number()
});
const CreateTicketBody = zod.object({
  projectId: zod.number().optional(),
  title: zod.string(),
  description: zod.string(),
  priority: zod.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: zod.number().optional()
});
const UpdateTicketParams = zod.object({
  id: zod.coerce.number()
});
const UpdateTicketBody = zod.object({
  title: zod.string().optional(),
  description: zod.string().optional(),
  status: zod.enum(["open", "pending", "resolved", "closed"]).optional(),
  priority: zod.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: zod.number().optional()
});
const UpdateTicketResponse = zod.object({
  id: zod.number(),
  projectId: zod.number().nullish(),
  projectName: zod.string().nullish(),
  creatorId: zod.number(),
  creatorName: zod.string().optional(),
  assignedTo: zod.number().nullish(),
  assigneeName: zod.string().nullish(),
  title: zod.string(),
  description: zod.string(),
  status: zod.enum(["open", "pending", "resolved", "closed"]),
  priority: zod.enum(["low", "medium", "high", "urgent"]),
  attachments: zod.array(zod.string()).optional(),
  createdAt: zod.string(),
  updatedAt: zod.string()
});
const UpdateFcmTokenBody = zod.object({
  token: zod.string()
});
const GetMeResponse = zod.object({
  id: zod.number(),
  employeeId: zod.string().nullish(),
  name: zod.string(),
  email: zod.string(),
  role: zod.enum(["super_admin", "developer", "tester", "client"]),
  subType: zod.string().nullish(),
  designation: zod.string().nullish(),
  avatarUrl: zod.string().nullish(),
  department: zod.string().optional(),
  phoneNumber: zod.string().nullish(),
  joiningDate: zod.string().nullish(),
  linkedinUrl: zod.string().nullish(),
  status: zod.enum(["active", "inactive", "suspended"]),
  lastLoginAt: zod.string().nullish(),
  createdAt: zod.string()
});
const UpdateMyProfileBody = zod.object({
  name: zod.string().optional(),
  designation: zod.string().optional(),
  avatarUrl: zod.string().optional()
});
const UpdateMyProfileResponse = zod.object({
  id: zod.number(),
  employeeId: zod.string().nullish(),
  name: zod.string(),
  email: zod.string(),
  role: zod.enum(["super_admin", "developer", "tester", "client"]),
  subType: zod.string().nullish(),
  designation: zod.string().nullish(),
  avatarUrl: zod.string().nullish(),
  department: zod.string().optional(),
  phoneNumber: zod.string().nullish(),
  joiningDate: zod.string().nullish(),
  linkedinUrl: zod.string().nullish(),
  status: zod.enum(["active", "inactive", "suspended"]),
  lastLoginAt: zod.string().nullish(),
  createdAt: zod.string()
});
const ListUsersQueryParams = zod.object({
  role: zod.coerce.string().optional(),
  subType: zod.coerce.string().optional(),
  search: zod.coerce.string().optional(),
  page: zod.coerce.number().optional(),
  limit: zod.coerce.number().optional()
});
const ListUsersResponse = zod.object({
  users: zod.array(
    zod.object({
      id: zod.number(),
      employeeId: zod.string().nullish(),
      name: zod.string(),
      email: zod.string(),
      role: zod.enum(["super_admin", "developer", "tester", "client"]),
      subType: zod.string().nullish(),
      designation: zod.string().nullish(),
      avatarUrl: zod.string().nullish(),
      department: zod.string().optional(),
      phoneNumber: zod.string().nullish(),
      joiningDate: zod.string().nullish(),
      linkedinUrl: zod.string().nullish(),
      status: zod.enum(["active", "inactive", "suspended"]),
      lastLoginAt: zod.string().nullish(),
      createdAt: zod.string()
    })
  ),
  total: zod.number(),
  page: zod.number(),
  limit: zod.number()
});
const CreateUserBody = zod.object({
  name: zod.string(),
  email: zod.string(),
  password: zod.string(),
  role: zod.enum(["super_admin", "developer", "tester", "client"]),
  subType: zod.string().optional(),
  designation: zod.string().optional(),
  avatarUrl: zod.string().optional(),
  department: zod.string().optional(),
  phoneNumber: zod.string().optional(),
  joiningDate: zod.string().optional(),
  linkedinUrl: zod.string().optional()
});
const GetUserParams = zod.object({
  id: zod.coerce.number()
});
const GetUserResponse = zod.object({
  id: zod.number(),
  employeeId: zod.string().nullish(),
  name: zod.string(),
  email: zod.string(),
  role: zod.enum(["super_admin", "developer", "tester", "client"]),
  subType: zod.string().nullish(),
  designation: zod.string().nullish(),
  avatarUrl: zod.string().nullish(),
  department: zod.string().optional(),
  phoneNumber: zod.string().nullish(),
  joiningDate: zod.string().nullish(),
  linkedinUrl: zod.string().nullish(),
  status: zod.enum(["active", "inactive", "suspended"]),
  lastLoginAt: zod.string().nullish(),
  createdAt: zod.string()
});
const UpdateUserParams = zod.object({
  id: zod.coerce.number()
});
const UpdateUserBody = zod.object({
  name: zod.string().optional(),
  email: zod.string().optional(),
  subType: zod.string().optional(),
  designation: zod.string().optional(),
  avatarUrl: zod.string().optional(),
  department: zod.string().optional(),
  phoneNumber: zod.string().optional(),
  joiningDate: zod.string().optional(),
  linkedinUrl: zod.string().optional(),
  status: zod.enum(["active", "inactive", "suspended"]).optional()
});
const UpdateUserResponse = zod.object({
  id: zod.number(),
  employeeId: zod.string().nullish(),
  name: zod.string(),
  email: zod.string(),
  role: zod.enum(["super_admin", "developer", "tester", "client"]),
  subType: zod.string().nullish(),
  designation: zod.string().nullish(),
  avatarUrl: zod.string().nullish(),
  department: zod.string().optional(),
  phoneNumber: zod.string().nullish(),
  joiningDate: zod.string().nullish(),
  linkedinUrl: zod.string().nullish(),
  status: zod.enum(["active", "inactive", "suspended"]),
  lastLoginAt: zod.string().nullish(),
  createdAt: zod.string()
});
const DeleteUserParams = zod.object({
  id: zod.coerce.number()
});
const ResetUserPasswordParams = zod.object({
  id: zod.coerce.number()
});
const ResetUserPasswordBody = zod.object({
  newPassword: zod.string()
});
const GetUserCredentialsParams = zod.object({
  id: zod.coerce.number()
});
const GetUserCredentialsResponseItem = zod.object({
  id: zod.number(),
  entryNumber: zod.number(),
  setBy: zod.string(),
  setAt: zod.string(),
  replacedAt: zod.string().nullish(),
  status: zod.enum(["active", "expired"]),
  trigger: zod.string()
});
const GetUserCredentialsResponse = zod.array(
  GetUserCredentialsResponseItem
);
const RevealCredentialParams = zod.object({
  id: zod.coerce.number(),
  credId: zod.coerce.number()
});
const RevealCredentialResponse = zod.object({
  password: zod.string()
});
const ChangeMyPasswordBody = zod.object({
  currentPassword: zod.string(),
  newPassword: zod.string()
});
const ListClientsQueryParams = zod.object({
  status: zod.coerce.string().optional(),
  search: zod.coerce.string().optional(),
  page: zod.coerce.number().optional(),
  limit: zod.coerce.number().optional()
});
const ListClientsResponse = zod.object({
  clients: zod.array(
    zod.object({
      id: zod.number(),
      companyName: zod.string(),
      contactPerson: zod.string(),
      email: zod.string(),
      phone: zod.string().nullish(),
      address: zod.string().nullish(),
      gstNumber: zod.string().nullish(),
      logoUrl: zod.string().nullish(),
      industry: zod.string().nullish(),
      website: zod.string().nullish(),
      tier: zod.string().optional(),
      status: zod.enum(["active", "inactive", "on_hold"]),
      portalLogin: zod.boolean(),
      clientSince: zod.string(),
      userId: zod.number().nullish(),
      activeProjectCount: zod.number()
    })
  ),
  total: zod.number(),
  page: zod.number(),
  limit: zod.number()
});
const CreateClientBody = zod.object({
  companyName: zod.string(),
  contactPerson: zod.string(),
  email: zod.string(),
  phone: zod.string().optional(),
  address: zod.string().optional(),
  gstNumber: zod.string().optional(),
  logoUrl: zod.string().optional(),
  industry: zod.string().optional(),
  website: zod.string().optional(),
  tier: zod.string().optional(),
  status: zod.enum(["active", "inactive", "on_hold"]).optional()
});
const ListCompaniesQueryParams = zod.object({
  status: zod.coerce.string().optional(),
  search: zod.coerce.string().optional(),
  page: zod.coerce.number().optional(),
  limit: zod.coerce.number().optional()
});
const ListCompaniesResponse = zod.object({
  companies: zod.array(
    zod.object({
      id: zod.number(),
      companyName: zod.string(),
      contactPerson: zod.string(),
      email: zod.string(),
      phone: zod.string().nullish(),
      address: zod.string().nullish(),
      gstNumber: zod.string().nullish(),
      logoUrl: zod.string().nullish(),
      industry: zod.string().nullish(),
      website: zod.string().nullish(),
      tier: zod.string().optional(),
      status: zod.enum(["active", "inactive", "on_hold"]),
      portalLogin: zod.boolean(),
      clientSince: zod.string(),
      userId: zod.number().nullish(),
      activeProjectCount: zod.number()
    }).and(
      zod.object({
        companyId: zod.number().optional(),
        companyCode: zod.string().nullish(),
        totalProjects: zod.number().optional(),
        openTickets: zod.number().optional()
      })
    )
  ),
  clients: zod.array(
    zod.object({
      id: zod.number(),
      companyName: zod.string(),
      contactPerson: zod.string(),
      email: zod.string(),
      phone: zod.string().nullish(),
      address: zod.string().nullish(),
      gstNumber: zod.string().nullish(),
      logoUrl: zod.string().nullish(),
      industry: zod.string().nullish(),
      website: zod.string().nullish(),
      tier: zod.string().optional(),
      status: zod.enum(["active", "inactive", "on_hold"]),
      portalLogin: zod.boolean(),
      clientSince: zod.string(),
      userId: zod.number().nullish(),
      activeProjectCount: zod.number()
    })
  ).optional(),
  total: zod.number(),
  page: zod.number(),
  limit: zod.number()
});
const GetCompanyParams = zod.object({
  id: zod.coerce.number()
});
const GetCompanyResponse = zod.object({
  id: zod.number(),
  companyName: zod.string(),
  contactPerson: zod.string(),
  email: zod.string(),
  phone: zod.string().nullish(),
  address: zod.string().nullish(),
  gstNumber: zod.string().nullish(),
  logoUrl: zod.string().nullish(),
  industry: zod.string().nullish(),
  website: zod.string().nullish(),
  tier: zod.string().optional(),
  status: zod.enum(["active", "inactive", "on_hold"]),
  portalLogin: zod.boolean(),
  clientSince: zod.string(),
  userId: zod.number().nullish(),
  activeProjectCount: zod.number()
}).and(
  zod.object({
    companyId: zod.number().optional(),
    companyCode: zod.string().nullish(),
    totalProjects: zod.number().optional(),
    openTickets: zod.number().optional()
  })
);
const ListCompanyProjectsParams = zod.object({
  id: zod.coerce.number()
});
const ListCompanyProjectsResponse = zod.object({
  projects: zod.array(
    zod.object({
      id: zod.number(),
      name: zod.string(),
      companyId: zod.number(),
      companyName: zod.string(),
      clientId: zod.number(),
      clientName: zod.string(),
      pmId: zod.number().nullish(),
      pmName: zod.string().nullish(),
      description: zod.string().nullish(),
      status: zod.enum([
        "scoping",
        "in_progress",
        "on_hold",
        "uat",
        "completed",
        "maintenance"
      ]),
      priority: zod.enum(["low", "medium", "high", "critical"]),
      type: zod.enum(["development", "maintenance"]),
      startDate: zod.string(),
      deadline: zod.string(),
      techStack: zod.array(zod.string()),
      figmaUrl: zod.string().nullish(),
      repoUrl: zod.string().nullish(),
      stagingUrl: zod.string().nullish(),
      productionUrl: zod.string().nullish(),
      adminUrl: zod.string().nullish(),
      websiteUrl: zod.string().nullish(),
      postmanJson: zod.string().nullish(),
      completionPct: zod.number(),
      completionOverride: zod.number().nullish(),
      memberCount: zod.number(),
      createdAt: zod.string()
    })
  ).optional(),
  total: zod.number().optional()
});
const GetCompanyAnalyticsResponse = zod.object({
  companies: zod.array(
    zod.object({
      companyId: zod.number(),
      companyName: zod.string(),
      clientId: zod.number().optional(),
      totalProjects: zod.number(),
      activeProjects: zod.number(),
      completedProjects: zod.number().optional(),
      delayedProjects: zod.number().optional(),
      openTickets: zod.number().optional(),
      pendingRequests: zod.number().optional(),
      developerCount: zod.number().optional()
    })
  )
});
const GetClientParams = zod.object({
  id: zod.coerce.number()
});
const GetClientResponse = zod.object({
  id: zod.number(),
  companyName: zod.string(),
  contactPerson: zod.string(),
  email: zod.string(),
  phone: zod.string().nullish(),
  address: zod.string().nullish(),
  gstNumber: zod.string().nullish(),
  logoUrl: zod.string().nullish(),
  industry: zod.string().nullish(),
  website: zod.string().nullish(),
  tier: zod.string().optional(),
  status: zod.enum(["active", "inactive", "on_hold"]),
  portalLogin: zod.boolean(),
  clientSince: zod.string(),
  userId: zod.number().nullish(),
  activeProjectCount: zod.number()
});
const UpdateClientParams = zod.object({
  id: zod.coerce.number()
});
const UpdateClientBody = zod.object({
  companyName: zod.string().optional(),
  contactPerson: zod.string().optional(),
  email: zod.string().optional(),
  phone: zod.string().optional(),
  address: zod.string().optional(),
  gstNumber: zod.string().optional(),
  logoUrl: zod.string().optional(),
  industry: zod.string().optional(),
  website: zod.string().optional(),
  tier: zod.string().optional(),
  status: zod.enum(["active", "inactive", "on_hold"]).optional()
});
const UpdateClientResponse = zod.object({
  id: zod.number(),
  companyName: zod.string(),
  contactPerson: zod.string(),
  email: zod.string(),
  phone: zod.string().nullish(),
  address: zod.string().nullish(),
  gstNumber: zod.string().nullish(),
  logoUrl: zod.string().nullish(),
  industry: zod.string().nullish(),
  website: zod.string().nullish(),
  tier: zod.string().optional(),
  status: zod.enum(["active", "inactive", "on_hold"]),
  portalLogin: zod.boolean(),
  clientSince: zod.string(),
  userId: zod.number().nullish(),
  activeProjectCount: zod.number()
});
const ListProjectsQueryParams = zod.object({
  status: zod.coerce.string().optional(),
  clientId: zod.coerce.number().optional(),
  companyId: zod.coerce.number().optional(),
  search: zod.coerce.string().optional(),
  type: zod.enum(["development", "maintenance"]).optional(),
  priority: zod.enum(["low", "medium", "high", "critical"]).optional(),
  page: zod.coerce.number().optional(),
  limit: zod.coerce.number().optional()
});
const ListProjectsResponse = zod.object({
  projects: zod.array(
    zod.object({
      id: zod.number(),
      name: zod.string(),
      companyId: zod.number(),
      companyName: zod.string(),
      clientId: zod.number(),
      clientName: zod.string(),
      pmId: zod.number().nullish(),
      pmName: zod.string().nullish(),
      description: zod.string().nullish(),
      status: zod.enum([
        "scoping",
        "in_progress",
        "on_hold",
        "uat",
        "completed",
        "maintenance"
      ]),
      priority: zod.enum(["low", "medium", "high", "critical"]),
      type: zod.enum(["development", "maintenance"]),
      startDate: zod.string(),
      deadline: zod.string(),
      techStack: zod.array(zod.string()),
      figmaUrl: zod.string().nullish(),
      repoUrl: zod.string().nullish(),
      stagingUrl: zod.string().nullish(),
      productionUrl: zod.string().nullish(),
      adminUrl: zod.string().nullish(),
      websiteUrl: zod.string().nullish(),
      postmanJson: zod.string().nullish(),
      completionPct: zod.number(),
      completionOverride: zod.number().nullish(),
      memberCount: zod.number(),
      createdAt: zod.string()
    })
  ),
  total: zod.number(),
  page: zod.number(),
  limit: zod.number()
});
const CreateProjectBody = zod.object({
  name: zod.string(),
  companyId: zod.number().optional(),
  clientId: zod.number(),
  pmId: zod.number().optional(),
  description: zod.string().optional(),
  status: zod.enum([
    "scoping",
    "in_progress",
    "on_hold",
    "uat",
    "completed",
    "maintenance"
  ]).optional(),
  priority: zod.enum(["low", "medium", "high", "critical"]),
  type: zod.enum(["development", "maintenance"]).optional(),
  startDate: zod.string(),
  deadline: zod.string(),
  techStack: zod.array(zod.string()).optional(),
  figmaUrl: zod.string().optional(),
  repoUrl: zod.string().optional(),
  stagingUrl: zod.string().optional(),
  productionUrl: zod.string().optional(),
  adminUrl: zod.string().optional(),
  websiteUrl: zod.string().optional(),
  postmanJson: zod.string().optional()
});
const GetProjectParams = zod.object({
  id: zod.coerce.number()
});
const GetProjectResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  companyId: zod.number(),
  companyName: zod.string(),
  clientId: zod.number(),
  clientName: zod.string(),
  pmId: zod.number().nullish(),
  pmName: zod.string().nullish(),
  description: zod.string().nullish(),
  status: zod.enum([
    "scoping",
    "in_progress",
    "on_hold",
    "uat",
    "completed",
    "maintenance"
  ]),
  priority: zod.enum(["low", "medium", "high", "critical"]),
  type: zod.enum(["development", "maintenance"]),
  startDate: zod.string(),
  deadline: zod.string(),
  techStack: zod.array(zod.string()),
  figmaUrl: zod.string().nullish(),
  repoUrl: zod.string().nullish(),
  stagingUrl: zod.string().nullish(),
  productionUrl: zod.string().nullish(),
  adminUrl: zod.string().nullish(),
  websiteUrl: zod.string().nullish(),
  postmanJson: zod.string().nullish(),
  completionPct: zod.number(),
  completionOverride: zod.number().nullish(),
  memberCount: zod.number(),
  createdAt: zod.string()
});
const UpdateProjectParams = zod.object({
  id: zod.coerce.number()
});
const UpdateProjectBody = zod.object({
  name: zod.string().optional(),
  pmId: zod.number().optional(),
  description: zod.string().optional(),
  status: zod.enum([
    "scoping",
    "in_progress",
    "on_hold",
    "uat",
    "completed",
    "maintenance"
  ]).optional(),
  priority: zod.enum(["low", "medium", "high", "critical"]).optional(),
  type: zod.enum(["development", "maintenance"]).optional(),
  startDate: zod.string().optional(),
  deadline: zod.string().optional(),
  techStack: zod.array(zod.string()).optional(),
  figmaUrl: zod.string().optional(),
  repoUrl: zod.string().optional(),
  stagingUrl: zod.string().optional(),
  productionUrl: zod.string().optional(),
  adminUrl: zod.string().optional(),
  websiteUrl: zod.string().optional(),
  postmanJson: zod.string().optional(),
  completionOverride: zod.number().optional()
});
const UpdateProjectResponse = zod.object({
  id: zod.number(),
  name: zod.string(),
  companyId: zod.number(),
  companyName: zod.string(),
  clientId: zod.number(),
  clientName: zod.string(),
  pmId: zod.number().nullish(),
  pmName: zod.string().nullish(),
  description: zod.string().nullish(),
  status: zod.enum([
    "scoping",
    "in_progress",
    "on_hold",
    "uat",
    "completed",
    "maintenance"
  ]),
  priority: zod.enum(["low", "medium", "high", "critical"]),
  type: zod.enum(["development", "maintenance"]),
  startDate: zod.string(),
  deadline: zod.string(),
  techStack: zod.array(zod.string()),
  figmaUrl: zod.string().nullish(),
  repoUrl: zod.string().nullish(),
  stagingUrl: zod.string().nullish(),
  productionUrl: zod.string().nullish(),
  adminUrl: zod.string().nullish(),
  websiteUrl: zod.string().nullish(),
  postmanJson: zod.string().nullish(),
  completionPct: zod.number(),
  completionOverride: zod.number().nullish(),
  memberCount: zod.number(),
  createdAt: zod.string()
});
const DeleteProjectParams = zod.object({
  id: zod.coerce.number()
});
const GetProjectMembersParams = zod.object({
  id: zod.coerce.number()
});
const GetProjectMembersResponseItem = zod.object({
  userId: zod.number(),
  name: zod.string(),
  employeeId: zod.string().nullish(),
  subType: zod.string().nullish(),
  designation: zod.string().nullish(),
  avatarUrl: zod.string().nullish(),
  joinedAt: zod.string(),
  completionPct: zod.number(),
  lastLogDate: zod.string().nullish()
});
const GetProjectMembersResponse = zod.array(
  GetProjectMembersResponseItem
);
const AddProjectMemberParams = zod.object({
  id: zod.coerce.number()
});
const AddProjectMemberBody = zod.object({
  userId: zod.number(),
  subType: zod.string().optional()
});
const RemoveProjectMemberParams = zod.object({
  id: zod.coerce.number(),
  userId: zod.coerce.number()
});
const GetApkSchedulesParams = zod.object({
  id: zod.coerce.number()
});
const GetApkSchedulesResponseItem = zod.object({
  id: zod.number(),
  projectId: zod.number(),
  scheduledDate: zod.string(),
  label: zod.string(),
  audience: zod.enum(["team_only", "client_visible"]),
  createdAt: zod.string()
});
const GetApkSchedulesResponse = zod.array(GetApkSchedulesResponseItem);
const CreateApkScheduleParams = zod.object({
  id: zod.coerce.number()
});
const CreateApkScheduleBody = zod.object({
  scheduledDate: zod.string(),
  label: zod.string(),
  audience: zod.enum(["team_only", "client_visible"])
});
const GetProjectMilestonesParams = zod.object({
  id: zod.coerce.number()
});
const GetProjectMilestonesResponseItem = zod.object({
  id: zod.number(),
  projectId: zod.number(),
  title: zod.string(),
  plannedDate: zod.string(),
  actualDate: zod.string().nullish(),
  status: zod.enum(["pending", "completed", "delayed"]),
  createdAt: zod.string()
});
const GetProjectMilestonesResponse = zod.array(
  GetProjectMilestonesResponseItem
);
const GetProjectHistoryParams = zod.object({
  id: zod.coerce.number()
});
const GetProjectHistoryResponseItem = zod.object({
  id: zod.number(),
  actorId: zod.number().nullish(),
  action: zod.string(),
  entityType: zod.string(),
  entityId: zod.number().nullish(),
  oldVal: zod.object({}).passthrough().optional(),
  newVal: zod.object({}).passthrough().optional(),
  ipAddress: zod.string().nullish(),
  metadata: zod.object({}).passthrough().optional(),
  createdAt: zod.string()
});
const GetProjectHistoryResponse = zod.array(
  GetProjectHistoryResponseItem
);
const CreateMilestoneParams = zod.object({
  id: zod.coerce.number()
});
const CreateMilestoneBody = zod.object({
  title: zod.string(),
  plannedDate: zod.string(),
  status: zod.enum(["pending", "completed", "delayed"]).optional()
});
const GetProjectLogsParams = zod.object({
  id: zod.coerce.number()
});
const GetProjectLogsResponse = zod.object({
  logs: zod.array(
    zod.object({
      id: zod.number(),
      developerId: zod.number(),
      developerName: zod.string(),
      developerEmployeeId: zod.string().nullish(),
      projectId: zod.number(),
      projectName: zod.string(),
      logDate: zod.string(),
      workCategories: zod.array(zod.string()),
      taskTitle: zod.string(),
      taskDescription: zod.string().nullish(),
      hoursSpent: zod.number(),
      completionPct: zod.number(),
      blockers: zod.string().nullish(),
      nextDayPlan: zod.string().nullish(),
      createdAt: zod.string(),
      updatedAt: zod.string()
    })
  ),
  total: zod.number(),
  page: zod.number(),
  limit: zod.number()
});
const ListMyLogsQueryParams = zod.object({
  projectId: zod.coerce.number().optional(),
  developerId: zod.coerce.number().optional().describe("Filter by employee (super admin only)"),
  month: zod.coerce.number().optional(),
  year: zod.coerce.number().optional(),
  page: zod.coerce.number().optional(),
  limit: zod.coerce.number().optional()
});
const ListMyLogsResponse = zod.object({
  logs: zod.array(
    zod.object({
      id: zod.number(),
      developerId: zod.number(),
      developerName: zod.string(),
      developerEmployeeId: zod.string().nullish(),
      projectId: zod.number(),
      projectName: zod.string(),
      logDate: zod.string(),
      workCategories: zod.array(zod.string()),
      taskTitle: zod.string(),
      taskDescription: zod.string().nullish(),
      hoursSpent: zod.number(),
      completionPct: zod.number(),
      blockers: zod.string().nullish(),
      nextDayPlan: zod.string().nullish(),
      createdAt: zod.string(),
      updatedAt: zod.string()
    })
  ),
  total: zod.number(),
  page: zod.number(),
  limit: zod.number()
});
const CreateLogBody = zod.object({
  projectId: zod.number(),
  logDate: zod.string(),
  workCategories: zod.array(zod.string()),
  taskTitle: zod.string(),
  taskDescription: zod.string().optional(),
  hoursSpent: zod.number(),
  completionPct: zod.number(),
  blockers: zod.string().optional(),
  nextDayPlan: zod.string().optional()
});
const GetLogParams = zod.object({
  id: zod.coerce.number()
});
const GetLogResponse = zod.object({
  id: zod.number(),
  developerId: zod.number(),
  developerName: zod.string(),
  developerEmployeeId: zod.string().nullish(),
  projectId: zod.number(),
  projectName: zod.string(),
  logDate: zod.string(),
  workCategories: zod.array(zod.string()),
  taskTitle: zod.string(),
  taskDescription: zod.string().nullish(),
  hoursSpent: zod.number(),
  completionPct: zod.number(),
  blockers: zod.string().nullish(),
  nextDayPlan: zod.string().nullish(),
  createdAt: zod.string(),
  updatedAt: zod.string()
});
const UpdateLogParams = zod.object({
  id: zod.coerce.number()
});
const UpdateLogBody = zod.object({
  workCategories: zod.array(zod.string()).optional(),
  taskTitle: zod.string().optional(),
  taskDescription: zod.string().optional(),
  hoursSpent: zod.number().optional(),
  completionPct: zod.number().optional(),
  blockers: zod.string().optional(),
  nextDayPlan: zod.string().optional()
});
const UpdateLogResponse = zod.object({
  id: zod.number(),
  developerId: zod.number(),
  developerName: zod.string(),
  developerEmployeeId: zod.string().nullish(),
  projectId: zod.number(),
  projectName: zod.string(),
  logDate: zod.string(),
  workCategories: zod.array(zod.string()),
  taskTitle: zod.string(),
  taskDescription: zod.string().nullish(),
  hoursSpent: zod.number(),
  completionPct: zod.number(),
  blockers: zod.string().nullish(),
  nextDayPlan: zod.string().nullish(),
  createdAt: zod.string(),
  updatedAt: zod.string()
});
const GetProjectBugsParams = zod.object({
  id: zod.coerce.number()
});
const GetProjectBugsResponse = zod.object({
  bugs: zod.array(
    zod.object({
      id: zod.number(),
      bugNumber: zod.string(),
      projectId: zod.number(),
      projectName: zod.string(),
      reporterId: zod.number(),
      reporterName: zod.string(),
      assigneeId: zod.number().nullish(),
      assigneeName: zod.string().nullish(),
      assigneeRole: zod.string().nullish(),
      title: zod.string(),
      description: zod.string().nullish(),
      stepsToReproduce: zod.string().nullish(),
      expectedBehavior: zod.string().nullish(),
      actualBehavior: zod.string().nullish(),
      severity: zod.enum(["critical", "high", "medium", "low"]),
      priority: zod.enum(["p1", "p2", "p3", "p4"]),
      status: zod.enum([
        "open",
        "in_progress",
        "fixed",
        "verified",
        "wont_fix",
        "duplicate"
      ]),
      buildVersion: zod.string().nullish(),
      platform: zod.enum(["android", "ios", "web", "api", "all"]),
      createdAt: zod.string(),
      resolvedAt: zod.string().nullish(),
      attachmentUrl: zod.string().nullish()
    })
  ),
  total: zod.number(),
  page: zod.number(),
  limit: zod.number()
});
const ListBugsQueryParams = zod.object({
  projectId: zod.coerce.number().optional(),
  status: zod.coerce.string().optional(),
  severity: zod.coerce.string().optional(),
  page: zod.coerce.number().optional(),
  limit: zod.coerce.number().optional(),
  assigneeId: zod.coerce.number().optional(),
  scope: zod.enum(["all", "mine", "unassigned"]).optional()
});
const ListBugsResponse = zod.object({
  bugs: zod.array(
    zod.object({
      id: zod.number(),
      bugNumber: zod.string(),
      projectId: zod.number(),
      projectName: zod.string(),
      reporterId: zod.number(),
      reporterName: zod.string(),
      assigneeId: zod.number().nullish(),
      assigneeName: zod.string().nullish(),
      assigneeRole: zod.string().nullish(),
      title: zod.string(),
      description: zod.string().nullish(),
      stepsToReproduce: zod.string().nullish(),
      expectedBehavior: zod.string().nullish(),
      actualBehavior: zod.string().nullish(),
      severity: zod.enum(["critical", "high", "medium", "low"]),
      priority: zod.enum(["p1", "p2", "p3", "p4"]),
      status: zod.enum([
        "open",
        "in_progress",
        "fixed",
        "verified",
        "wont_fix",
        "duplicate"
      ]),
      buildVersion: zod.string().nullish(),
      platform: zod.enum(["android", "ios", "web", "api", "all"]),
      createdAt: zod.string(),
      resolvedAt: zod.string().nullish(),
      attachmentUrl: zod.string().nullish()
    })
  ),
  total: zod.number(),
  page: zod.number(),
  limit: zod.number()
});
const CreateBugBody = zod.object({
  projectId: zod.number(),
  title: zod.string(),
  description: zod.string().optional(),
  stepsToReproduce: zod.string().optional(),
  expectedBehavior: zod.string().optional(),
  actualBehavior: zod.string().optional(),
  severity: zod.enum(["critical", "high", "medium", "low"]),
  priority: zod.enum(["p1", "p2", "p3", "p4"]),
  buildVersion: zod.string().optional(),
  platform: zod.enum(["android", "ios", "web", "api", "all"]),
  assigneeId: zod.number().optional(),
  attachmentUrl: zod.string().optional()
});
const GetBugParams = zod.object({
  id: zod.coerce.number()
});
const GetBugResponse = zod.object({
  id: zod.number(),
  bugNumber: zod.string(),
  projectId: zod.number(),
  projectName: zod.string(),
  reporterId: zod.number(),
  reporterName: zod.string(),
  assigneeId: zod.number().nullish(),
  assigneeName: zod.string().nullish(),
  assigneeRole: zod.string().nullish(),
  title: zod.string(),
  description: zod.string().nullish(),
  stepsToReproduce: zod.string().nullish(),
  expectedBehavior: zod.string().nullish(),
  actualBehavior: zod.string().nullish(),
  severity: zod.enum(["critical", "high", "medium", "low"]),
  priority: zod.enum(["p1", "p2", "p3", "p4"]),
  status: zod.enum([
    "open",
    "in_progress",
    "fixed",
    "verified",
    "wont_fix",
    "duplicate"
  ]),
  buildVersion: zod.string().nullish(),
  platform: zod.enum(["android", "ios", "web", "api", "all"]),
  createdAt: zod.string(),
  resolvedAt: zod.string().nullish(),
  attachmentUrl: zod.string().nullish()
});
const UpdateBugParams = zod.object({
  id: zod.coerce.number()
});
const UpdateBugBody = zod.object({
  title: zod.string().optional(),
  description: zod.string().optional(),
  stepsToReproduce: zod.string().optional(),
  expectedBehavior: zod.string().optional(),
  actualBehavior: zod.string().optional(),
  severity: zod.enum(["critical", "high", "medium", "low"]).optional(),
  priority: zod.enum(["p1", "p2", "p3", "p4"]).optional(),
  status: zod.enum(["open", "in_progress", "fixed", "verified", "wont_fix", "duplicate"]).optional(),
  buildVersion: zod.string().optional(),
  platform: zod.enum(["android", "ios", "web", "api", "all"]).optional(),
  assigneeId: zod.number().optional(),
  attachmentUrl: zod.string().optional()
});
const UpdateBugResponse = zod.object({
  id: zod.number(),
  bugNumber: zod.string(),
  projectId: zod.number(),
  projectName: zod.string(),
  reporterId: zod.number(),
  reporterName: zod.string(),
  assigneeId: zod.number().nullish(),
  assigneeName: zod.string().nullish(),
  assigneeRole: zod.string().nullish(),
  title: zod.string(),
  description: zod.string().nullish(),
  stepsToReproduce: zod.string().nullish(),
  expectedBehavior: zod.string().nullish(),
  actualBehavior: zod.string().nullish(),
  severity: zod.enum(["critical", "high", "medium", "low"]),
  priority: zod.enum(["p1", "p2", "p3", "p4"]),
  status: zod.enum([
    "open",
    "in_progress",
    "fixed",
    "verified",
    "wont_fix",
    "duplicate"
  ]),
  buildVersion: zod.string().nullish(),
  platform: zod.enum(["android", "ios", "web", "api", "all"]),
  createdAt: zod.string(),
  resolvedAt: zod.string().nullish(),
  attachmentUrl: zod.string().nullish()
});
const AssignBugParams = zod.object({
  id: zod.coerce.number()
});
const AssignBugBody = zod.object({
  assigneeId: zod.number().nullish()
});
const AssignBugResponse = zod.object({
  id: zod.number(),
  bugNumber: zod.string(),
  projectId: zod.number(),
  projectName: zod.string(),
  reporterId: zod.number(),
  reporterName: zod.string(),
  assigneeId: zod.number().nullish(),
  assigneeName: zod.string().nullish(),
  assigneeRole: zod.string().nullish(),
  title: zod.string(),
  description: zod.string().nullish(),
  stepsToReproduce: zod.string().nullish(),
  expectedBehavior: zod.string().nullish(),
  actualBehavior: zod.string().nullish(),
  severity: zod.enum(["critical", "high", "medium", "low"]),
  priority: zod.enum(["p1", "p2", "p3", "p4"]),
  status: zod.enum([
    "open",
    "in_progress",
    "fixed",
    "verified",
    "wont_fix",
    "duplicate"
  ]),
  buildVersion: zod.string().nullish(),
  platform: zod.enum(["android", "ios", "web", "api", "all"]),
  createdAt: zod.string(),
  resolvedAt: zod.string().nullish(),
  attachmentUrl: zod.string().nullish()
});
const ListTasksQueryParams = zod.object({
  projectId: zod.coerce.number().optional(),
  status: zod.coerce.string().optional(),
  assigneeId: zod.coerce.number().optional(),
  scope: zod.enum(["all", "mine", "unassigned", "created"]).optional(),
  page: zod.coerce.number().optional(),
  limit: zod.coerce.number().optional()
});
const ListTasksResponse = zod.object({
  tasks: zod.array(
    zod.object({
      id: zod.number(),
      taskNumber: zod.string(),
      projectId: zod.number(),
      projectName: zod.string(),
      createdById: zod.number(),
      createdByName: zod.string(),
      assigneeId: zod.number().nullish(),
      assigneeName: zod.string().nullish(),
      assigneeRole: zod.string().nullish(),
      title: zod.string(),
      description: zod.string().nullish(),
      status: zod.enum([
        "backlog",
        "todo",
        "in_progress",
        "in_review",
        "done",
        "blocked"
      ]),
      priority: zod.enum(["urgent", "high", "normal", "low"]),
      type: zod.enum(["task", "feature", "bug_fix", "qa", "chore"]),
      dueDate: zod.string().nullish(),
      labels: zod.array(zod.string()),
      createdAt: zod.string(),
      updatedAt: zod.string(),
      completedAt: zod.string().nullish()
    })
  ),
  total: zod.number(),
  page: zod.number(),
  limit: zod.number()
});
const CreateTaskBody = zod.object({
  projectId: zod.number(),
  title: zod.string(),
  description: zod.string().optional(),
  assigneeId: zod.number().optional(),
  status: zod.enum(["backlog", "todo", "in_progress", "in_review", "done", "blocked"]).optional(),
  priority: zod.enum(["urgent", "high", "normal", "low"]).optional(),
  type: zod.enum(["task", "feature", "bug_fix", "qa", "chore"]).optional(),
  dueDate: zod.string().optional(),
  labels: zod.array(zod.string()).optional()
});
const GetTaskParams = zod.object({
  id: zod.coerce.number()
});
const GetTaskResponse = zod.object({
  id: zod.number(),
  taskNumber: zod.string(),
  projectId: zod.number(),
  projectName: zod.string(),
  createdById: zod.number(),
  createdByName: zod.string(),
  assigneeId: zod.number().nullish(),
  assigneeName: zod.string().nullish(),
  assigneeRole: zod.string().nullish(),
  title: zod.string(),
  description: zod.string().nullish(),
  status: zod.enum([
    "backlog",
    "todo",
    "in_progress",
    "in_review",
    "done",
    "blocked"
  ]),
  priority: zod.enum(["urgent", "high", "normal", "low"]),
  type: zod.enum(["task", "feature", "bug_fix", "qa", "chore"]),
  dueDate: zod.string().nullish(),
  labels: zod.array(zod.string()),
  createdAt: zod.string(),
  updatedAt: zod.string(),
  completedAt: zod.string().nullish()
});
const UpdateTaskParams = zod.object({
  id: zod.coerce.number()
});
const UpdateTaskBody = zod.object({
  title: zod.string().optional(),
  description: zod.string().optional(),
  assigneeId: zod.number().nullish(),
  status: zod.enum(["backlog", "todo", "in_progress", "in_review", "done", "blocked"]).optional(),
  priority: zod.enum(["urgent", "high", "normal", "low"]).optional(),
  type: zod.enum(["task", "feature", "bug_fix", "qa", "chore"]).optional(),
  dueDate: zod.string().optional(),
  labels: zod.array(zod.string()).optional()
});
const UpdateTaskResponse = zod.object({
  id: zod.number(),
  taskNumber: zod.string(),
  projectId: zod.number(),
  projectName: zod.string(),
  createdById: zod.number(),
  createdByName: zod.string(),
  assigneeId: zod.number().nullish(),
  assigneeName: zod.string().nullish(),
  assigneeRole: zod.string().nullish(),
  title: zod.string(),
  description: zod.string().nullish(),
  status: zod.enum([
    "backlog",
    "todo",
    "in_progress",
    "in_review",
    "done",
    "blocked"
  ]),
  priority: zod.enum(["urgent", "high", "normal", "low"]),
  type: zod.enum(["task", "feature", "bug_fix", "qa", "chore"]),
  dueDate: zod.string().nullish(),
  labels: zod.array(zod.string()),
  createdAt: zod.string(),
  updatedAt: zod.string(),
  completedAt: zod.string().nullish()
});
const ListAssignableMembersParams = zod.object({
  id: zod.coerce.number()
});
const ListAssignableMembersQueryParams = zod.object({
  for: zod.enum(["bug", "task"]).optional()
});
const ListAssignableMembersResponse = zod.object({
  members: zod.array(
    zod.object({
      id: zod.number(),
      name: zod.string(),
      role: zod.string(),
      employeeId: zod.string().nullish(),
      avatarUrl: zod.string().nullish()
    })
  )
});
const GetApkReleasesParams = zod.object({
  id: zod.coerce.number()
});
const GetApkReleasesResponseItem = zod.object({
  id: zod.number(),
  projectId: zod.number(),
  uploaderId: zod.number(),
  uploaderName: zod.string(),
  version: zod.string(),
  buildNumber: zod.number(),
  releaseType: zod.enum(["alpha", "beta", "rc", "production"]),
  changelog: zod.string().nullish(),
  platform: zod.enum(["android", "ios"]),
  minOsVersion: zod.string().nullish(),
  fileUrl: zod.string(),
  audience: zod.enum(["team_only", "client_visible"]),
  apkScheduleId: zod.number().nullish(),
  createdAt: zod.string()
});
const GetApkReleasesResponse = zod.array(GetApkReleasesResponseItem);
const CreateApkReleaseParams = zod.object({
  id: zod.coerce.number()
});
const CreateApkReleaseBody = zod.object({
  version: zod.string(),
  buildNumber: zod.number().optional(),
  releaseType: zod.enum(["alpha", "beta", "rc", "production"]),
  changelog: zod.string().optional(),
  platform: zod.enum(["android", "ios"]),
  minOsVersion: zod.string().optional(),
  fileUrl: zod.string(),
  audience: zod.enum(["team_only", "client_visible"]),
  apkScheduleId: zod.number().optional()
});
const GetApkReleaseParams = zod.object({
  id: zod.coerce.number()
});
const GetApkReleaseResponse = zod.object({
  id: zod.number(),
  projectId: zod.number(),
  uploaderId: zod.number(),
  uploaderName: zod.string(),
  version: zod.string(),
  buildNumber: zod.number(),
  releaseType: zod.enum(["alpha", "beta", "rc", "production"]),
  changelog: zod.string().nullish(),
  platform: zod.enum(["android", "ios"]),
  minOsVersion: zod.string().nullish(),
  fileUrl: zod.string(),
  audience: zod.enum(["team_only", "client_visible"]),
  apkScheduleId: zod.number().nullish(),
  createdAt: zod.string()
});
const ListCommentsQueryParams = zod.object({
  threadType: zod.coerce.string(),
  threadId: zod.coerce.number(),
  page: zod.coerce.number().optional(),
  limit: zod.coerce.number().optional()
});
const ListCommentsResponse = zod.object({
  comments: zod.array(
    zod.object({
      id: zod.number(),
      authorId: zod.number(),
      authorName: zod.string(),
      authorAvatarUrl: zod.string().nullish(),
      authorRole: zod.string(),
      threadType: zod.enum(["project", "log", "bug", "apk", "request"]),
      threadId: zod.number(),
      content: zod.string(),
      parentId: zod.number().nullish(),
      isEdited: zod.boolean(),
      replies: zod.array(zod.unknown()).optional(),
      createdAt: zod.string(),
      updatedAt: zod.string()
    })
  ),
  total: zod.number()
});
const CreateCommentBody = zod.object({
  threadType: zod.enum(["project", "log", "bug", "apk", "request"]),
  threadId: zod.number(),
  content: zod.string(),
  parentId: zod.number().optional()
});
const UpdateCommentParams = zod.object({
  id: zod.coerce.number()
});
const UpdateCommentBody = zod.object({
  content: zod.string()
});
const UpdateCommentResponse = zod.object({
  id: zod.number(),
  authorId: zod.number(),
  authorName: zod.string(),
  authorAvatarUrl: zod.string().nullish(),
  authorRole: zod.string(),
  threadType: zod.enum(["project", "log", "bug", "apk", "request"]),
  threadId: zod.number(),
  content: zod.string(),
  parentId: zod.number().nullish(),
  isEdited: zod.boolean(),
  replies: zod.array(zod.unknown()).optional(),
  createdAt: zod.string(),
  updatedAt: zod.string()
});
const ListNotificationsQueryParams = zod.object({
  unreadOnly: zod.coerce.boolean().optional(),
  page: zod.coerce.number().optional(),
  limit: zod.coerce.number().optional()
});
const ListNotificationsResponse = zod.object({
  notifications: zod.array(
    zod.object({
      id: zod.number(),
      type: zod.string(),
      title: zod.string(),
      body: zod.string(),
      entityType: zod.string().nullish(),
      entityId: zod.number().nullish(),
      readAt: zod.string().nullish(),
      createdAt: zod.string()
    })
  ),
  unreadCount: zod.number(),
  total: zod.number()
});
const MarkNotificationReadParams = zod.object({
  id: zod.coerce.number()
});
const ListRequestsQueryParams = zod.object({
  status: zod.coerce.string().optional(),
  projectId: zod.coerce.number().optional(),
  page: zod.coerce.number().optional(),
  limit: zod.coerce.number().optional()
});
const ListRequestsResponse = zod.object({
  requests: zod.array(
    zod.object({
      id: zod.number(),
      developerId: zod.number(),
      developerName: zod.string(),
      projectId: zod.number(),
      projectName: zod.string(),
      type: zod.enum([
        "software_license",
        "hardware",
        "api_access",
        "server_hosting",
        "design_asset",
        "other"
      ]),
      title: zod.string(),
      description: zod.string(),
      urgency: zod.enum(["low", "medium", "high"]),
      status: zod.enum(["pending", "approved", "rejected"]),
      adminNote: zod.string().nullish(),
      createdAt: zod.string(),
      updatedAt: zod.string()
    })
  ),
  total: zod.number(),
  page: zod.number(),
  limit: zod.number()
});
const CreateRequestBody = zod.object({
  projectId: zod.number(),
  type: zod.enum([
    "software_license",
    "hardware",
    "api_access",
    "server_hosting",
    "design_asset",
    "other"
  ]),
  title: zod.string(),
  description: zod.string(),
  urgency: zod.enum(["low", "medium", "high"])
});
const GetRequestParams = zod.object({
  id: zod.coerce.number()
});
const GetRequestResponse = zod.object({
  id: zod.number(),
  developerId: zod.number(),
  developerName: zod.string(),
  projectId: zod.number(),
  projectName: zod.string(),
  type: zod.enum([
    "software_license",
    "hardware",
    "api_access",
    "server_hosting",
    "design_asset",
    "other"
  ]),
  title: zod.string(),
  description: zod.string(),
  urgency: zod.enum(["low", "medium", "high"]),
  status: zod.enum(["pending", "approved", "rejected"]),
  adminNote: zod.string().nullish(),
  createdAt: zod.string(),
  updatedAt: zod.string()
});
const UpdateRequestParams = zod.object({
  id: zod.coerce.number()
});
const UpdateRequestBody = zod.object({
  status: zod.enum(["pending", "approved", "rejected"]).optional(),
  adminNote: zod.string().optional()
});
const UpdateRequestResponse = zod.object({
  id: zod.number(),
  developerId: zod.number(),
  developerName: zod.string(),
  projectId: zod.number(),
  projectName: zod.string(),
  type: zod.enum([
    "software_license",
    "hardware",
    "api_access",
    "server_hosting",
    "design_asset",
    "other"
  ]),
  title: zod.string(),
  description: zod.string(),
  urgency: zod.enum(["low", "medium", "high"]),
  status: zod.enum(["pending", "approved", "rejected"]),
  adminNote: zod.string().nullish(),
  createdAt: zod.string(),
  updatedAt: zod.string()
});
const GetDashboardStatsResponse = zod.object({
  activeProjects: zod.number(),
  totalClients: zod.number(),
  teamMembersOnline: zod.number(),
  overdueProjects: zod.number(),
  apksDueToday: zod.number(),
  openBugs: zod.number(),
  openRequests: zod.number(),
  recentActivity: zod.array(
    zod.object({
      id: zod.number(),
      actorName: zod.string(),
      actorAvatarUrl: zod.string().nullish(),
      action: zod.string(),
      entityType: zod.string(),
      entityName: zod.string(),
      timestamp: zod.string()
    })
  ),
  projectPipeline: zod.object({
    scoping: zod.number(),
    inProgress: zod.number(),
    uat: zod.number(),
    onHold: zod.number(),
    completed: zod.number(),
    maintenance: zod.number()
  }),
  bugSeverityBreakdown: zod.object({
    critical: zod.number(),
    high: zod.number(),
    medium: zod.number(),
    low: zod.number()
  })
});
const GetProjectAnalyticsParams = zod.object({
  id: zod.coerce.number()
});
const GetProjectAnalyticsResponse = zod.object({
  projectId: zod.number(),
  completionOverTime: zod.array(
    zod.object({
      date: zod.string(),
      value: zod.number()
    })
  ),
  developerContributions: zod.array(
    zod.object({
      developerId: zod.number(),
      developerName: zod.string(),
      completionPct: zod.number(),
      hoursLogged: zod.number()
    })
  ),
  workCategoryBreakdown: zod.array(
    zod.object({
      name: zod.string(),
      count: zod.number()
    })
  ),
  hoursPerWeek: zod.array(
    zod.object({
      date: zod.string(),
      value: zod.number()
    })
  ),
  totalHoursLogged: zod.number(),
  averageCompletionPct: zod.number()
});
const GetTeamAnalyticsQueryParams = zod.object({
  month: zod.coerce.number().optional(),
  year: zod.coerce.number().optional()
});
const GetTeamAnalyticsResponse = zod.object({
  developers: zod.array(
    zod.object({
      userId: zod.number(),
      name: zod.string(),
      employeeId: zod.string().nullish(),
      avatarUrl: zod.string().nullish(),
      subType: zod.string().nullish(),
      activeProjects: zod.number(),
      totalHoursThisMonth: zod.number(),
      utilisationPct: zod.number(),
      lastLogDate: zod.string().nullish()
    })
  ),
  heatmapData: zod.array(
    zod.object({
      date: zod.string(),
      count: zod.number()
    })
  )
});
const GetBugAnalyticsQueryParams = zod.object({
  projectId: zod.coerce.number().optional()
});
const GetBugAnalyticsResponse = zod.object({
  totalOpen: zod.number(),
  totalFixed: zod.number(),
  severityDistribution: zod.array(
    zod.object({
      name: zod.string(),
      count: zod.number()
    })
  ),
  statusDistribution: zod.array(
    zod.object({
      name: zod.string(),
      count: zod.number()
    })
  ),
  platformDistribution: zod.array(
    zod.object({
      name: zod.string(),
      count: zod.number()
    })
  )
});
const ListReportsResponseItem = zod.object({
  id: zod.number(),
  type: zod.enum([
    "developer_monthly",
    "project_progress",
    "bug_report",
    "team_utilisation",
    "client_dossier",
    "apk_release_history",
    "raw_log_export"
  ]),
  status: zod.enum(["queued", "generating", "ready", "failed"]),
  requestedBy: zod.number(),
  projectId: zod.number().nullish(),
  month: zod.number().nullish(),
  year: zod.number().nullish(),
  fileUrl: zod.string().nullish(),
  createdAt: zod.string(),
  completedAt: zod.string().nullish()
});
const ListReportsResponse = zod.array(ListReportsResponseItem);
const GenerateReportBody = zod.object({
  type: zod.enum([
    "developer_monthly",
    "project_progress",
    "bug_report",
    "team_utilisation",
    "client_dossier",
    "apk_release_history",
    "raw_log_export"
  ]),
  projectId: zod.number().optional(),
  month: zod.number().optional(),
  year: zod.number().optional(),
  includeDescriptions: zod.boolean().optional()
});
const DownloadReportParams = zod.object({
  id: zod.coerce.number()
});
const DownloadReportResponse = zod.object({
  url: zod.string(),
  expiresAt: zod.string()
});
const globalSearchQueryLimitDefault = 5;
const GlobalSearchQueryParams = zod.object({
  q: zod.coerce.string(),
  limit: zod.coerce.number().default(globalSearchQueryLimitDefault)
});
const GlobalSearchResponse = zod.object({
  projects: zod.array(
    zod.object({
      id: zod.number(),
      name: zod.string(),
      companyId: zod.number(),
      companyName: zod.string(),
      clientId: zod.number(),
      clientName: zod.string(),
      pmId: zod.number().nullish(),
      pmName: zod.string().nullish(),
      description: zod.string().nullish(),
      status: zod.enum([
        "scoping",
        "in_progress",
        "on_hold",
        "uat",
        "completed",
        "maintenance"
      ]),
      priority: zod.enum(["low", "medium", "high", "critical"]),
      type: zod.enum(["development", "maintenance"]),
      startDate: zod.string(),
      deadline: zod.string(),
      techStack: zod.array(zod.string()),
      figmaUrl: zod.string().nullish(),
      repoUrl: zod.string().nullish(),
      stagingUrl: zod.string().nullish(),
      productionUrl: zod.string().nullish(),
      adminUrl: zod.string().nullish(),
      websiteUrl: zod.string().nullish(),
      postmanJson: zod.string().nullish(),
      completionPct: zod.number(),
      completionOverride: zod.number().nullish(),
      memberCount: zod.number(),
      createdAt: zod.string()
    })
  ),
  clients: zod.array(
    zod.object({
      id: zod.number(),
      companyName: zod.string(),
      contactPerson: zod.string(),
      email: zod.string(),
      phone: zod.string().nullish(),
      address: zod.string().nullish(),
      gstNumber: zod.string().nullish(),
      logoUrl: zod.string().nullish(),
      industry: zod.string().nullish(),
      website: zod.string().nullish(),
      tier: zod.string().optional(),
      status: zod.enum(["active", "inactive", "on_hold"]),
      portalLogin: zod.boolean(),
      clientSince: zod.string(),
      userId: zod.number().nullish(),
      activeProjectCount: zod.number()
    })
  ),
  employees: zod.array(
    zod.object({
      id: zod.number(),
      employeeId: zod.string().nullish(),
      name: zod.string(),
      email: zod.string(),
      role: zod.enum(["super_admin", "developer", "tester", "client"]),
      subType: zod.string().nullish(),
      designation: zod.string().nullish(),
      avatarUrl: zod.string().nullish(),
      department: zod.string().optional(),
      phoneNumber: zod.string().nullish(),
      joiningDate: zod.string().nullish(),
      linkedinUrl: zod.string().nullish(),
      status: zod.enum(["active", "inactive", "suspended"]),
      lastLoginAt: zod.string().nullish(),
      createdAt: zod.string()
    })
  ),
  bugs: zod.array(
    zod.object({
      id: zod.number(),
      bugNumber: zod.string(),
      projectId: zod.number(),
      projectName: zod.string(),
      reporterId: zod.number(),
      reporterName: zod.string(),
      assigneeId: zod.number().nullish(),
      assigneeName: zod.string().nullish(),
      assigneeRole: zod.string().nullish(),
      title: zod.string(),
      description: zod.string().nullish(),
      stepsToReproduce: zod.string().nullish(),
      expectedBehavior: zod.string().nullish(),
      actualBehavior: zod.string().nullish(),
      severity: zod.enum(["critical", "high", "medium", "low"]),
      priority: zod.enum(["p1", "p2", "p3", "p4"]),
      status: zod.enum([
        "open",
        "in_progress",
        "fixed",
        "verified",
        "wont_fix",
        "duplicate"
      ]),
      buildVersion: zod.string().nullish(),
      platform: zod.enum(["android", "ios", "web", "api", "all"]),
      createdAt: zod.string(),
      resolvedAt: zod.string().nullish(),
      attachmentUrl: zod.string().nullish()
    })
  )
});
const GetSettingsResponse = zod.object({
  id: zod.number(),
  companyName: zod.string(),
  logoUrl: zod.string().nullish(),
  address: zod.string().nullish(),
  sealUrl: zod.string().nullish(),
  updatedAt: zod.string()
});
const UpdateSettingsBody = zod.object({
  companyName: zod.string().optional(),
  logoUrl: zod.string().optional(),
  address: zod.string().optional(),
  sealUrl: zod.string().optional()
});
const UpdateSettingsResponse = zod.object({
  id: zod.number(),
  companyName: zod.string(),
  logoUrl: zod.string().nullish(),
  address: zod.string().nullish(),
  sealUrl: zod.string().nullish(),
  updatedAt: zod.string()
});
export {
  AddProjectMemberBody,
  AddProjectMemberParams,
  AssignBugBody,
  AssignBugParams,
  AssignBugResponse,
  ChangeMyPasswordBody,
  CreateApkReleaseBody,
  CreateApkReleaseParams,
  CreateApkScheduleBody,
  CreateApkScheduleParams,
  CreateBugBody,
  CreateClientBody,
  CreateCommentBody,
  CreateLogBody,
  CreateMilestoneBody,
  CreateMilestoneParams,
  CreateProjectBody,
  CreateRequestBody,
  CreateTaskBody,
  CreateTicketBody,
  CreateUserBody,
  DeleteProjectParams,
  DeleteUserParams,
  DownloadReportParams,
  DownloadReportResponse,
  ForgotPasswordBody,
  GenerateReportBody,
  GetApkReleaseParams,
  GetApkReleaseResponse,
  GetApkReleasesParams,
  GetApkReleasesResponse,
  GetApkReleasesResponseItem,
  GetApkSchedulesParams,
  GetApkSchedulesResponse,
  GetApkSchedulesResponseItem,
  GetBugAnalyticsQueryParams,
  GetBugAnalyticsResponse,
  GetBugParams,
  GetBugResponse,
  GetClientParams,
  GetClientResponse,
  GetCompanyAnalyticsResponse,
  GetCompanyParams,
  GetCompanyResponse,
  GetDashboardStatsResponse,
  GetLogParams,
  GetLogResponse,
  GetMeResponse,
  GetProjectAnalyticsParams,
  GetProjectAnalyticsResponse,
  GetProjectBugsParams,
  GetProjectBugsResponse,
  GetProjectHistoryParams,
  GetProjectHistoryResponse,
  GetProjectHistoryResponseItem,
  GetProjectLogsParams,
  GetProjectLogsResponse,
  GetProjectMembersParams,
  GetProjectMembersResponse,
  GetProjectMembersResponseItem,
  GetProjectMilestonesParams,
  GetProjectMilestonesResponse,
  GetProjectMilestonesResponseItem,
  GetProjectParams,
  GetProjectResponse,
  GetRequestParams,
  GetRequestResponse,
  GetSettingsResponse,
  GetTaskParams,
  GetTaskResponse,
  GetTeamAnalyticsQueryParams,
  GetTeamAnalyticsResponse,
  GetUserCredentialsParams,
  GetUserCredentialsResponse,
  GetUserCredentialsResponseItem,
  GetUserParams,
  GetUserResponse,
  GlobalSearchQueryParams,
  GlobalSearchResponse,
  HealthCheckResponse,
  ListAssignableMembersParams,
  ListAssignableMembersQueryParams,
  ListAssignableMembersResponse,
  ListBugsQueryParams,
  ListBugsResponse,
  ListClientsQueryParams,
  ListClientsResponse,
  ListCommentsQueryParams,
  ListCommentsResponse,
  ListCompaniesQueryParams,
  ListCompaniesResponse,
  ListCompanyProjectsParams,
  ListCompanyProjectsResponse,
  ListMyLogsQueryParams,
  ListMyLogsResponse,
  ListNotificationsQueryParams,
  ListNotificationsResponse,
  ListProjectsQueryParams,
  ListProjectsResponse,
  ListReportsResponse,
  ListReportsResponseItem,
  ListRequestsQueryParams,
  ListRequestsResponse,
  ListTasksQueryParams,
  ListTasksResponse,
  ListTicketsQueryParams,
  ListTicketsResponse,
  ListUsersQueryParams,
  ListUsersResponse,
  LoginBody,
  LoginResponse,
  MarkNotificationReadParams,
  RefreshTokenBody,
  RefreshTokenResponse,
  RemoveProjectMemberParams,
  ResetPasswordBody,
  ResetUserPasswordBody,
  ResetUserPasswordParams,
  RevealCredentialParams,
  RevealCredentialResponse,
  UpdateBugBody,
  UpdateBugParams,
  UpdateBugResponse,
  UpdateClientBody,
  UpdateClientParams,
  UpdateClientResponse,
  UpdateCommentBody,
  UpdateCommentParams,
  UpdateCommentResponse,
  UpdateFcmTokenBody,
  UpdateLogBody,
  UpdateLogParams,
  UpdateLogResponse,
  UpdateMyProfileBody,
  UpdateMyProfileResponse,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateProjectResponse,
  UpdateRequestBody,
  UpdateRequestParams,
  UpdateRequestResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
  UpdateTicketBody,
  UpdateTicketParams,
  UpdateTicketResponse,
  UpdateUserBody,
  UpdateUserParams,
  UpdateUserResponse,
  globalSearchQueryLimitDefault
};
