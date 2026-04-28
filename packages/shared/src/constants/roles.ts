export enum Role {
  ADMIN       = 'ADMIN',
  MANAGER     = 'MANAGER',
  SHOPKEEPER  = 'SHOPKEEPER',
  WHOLESALER  = 'WHOLESALER',
  CUSTOMER    = 'CUSTOMER',
}

export const STAFF_ROLES: Role[] = [
  Role.ADMIN,
  Role.MANAGER,
  Role.SHOPKEEPER,
];
