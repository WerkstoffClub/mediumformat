export enum Role {
  ADMIN       = 'ADMIN',
  MANAGER     = 'MANAGER',
  SHOPKEEPER  = 'SHOPKEEPER',
  WHOLESALER  = 'WHOLESALER',
  CUSTOMER    = 'CUSTOMER',
}

export const STAFF_ROLES: readonly Role[] = [
  Role.ADMIN,
  Role.MANAGER,
  Role.SHOPKEEPER,
];
