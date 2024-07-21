
const CreateNewUser = async (user) => {
    try {
        const response = await fetch('http://localhost:3000/api/user/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
        })
        return response.json()
    } catch (error) {
        console.error('Error:', error)
    }
}

export { CreateNewUser }