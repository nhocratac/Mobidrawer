export const getRole = (): 'admin' | 'user' | 'guest' => {
    type Role = 'admin' | 'user' | 'guest';

    let role: Role = 'guest';

    // Add your logic to check if the user is logged in

    // Add your logic to check if the user is an admin

    return role;
};
