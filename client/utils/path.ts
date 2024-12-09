
const path ={
    login: '/login',
    register: '/register',
    home: '/',
    landingPage : '/LandingPage',
    user : {
        dashboard : '/user/dashboard',
        recent : '/user/recent',
        store : '/user/store',
        post : '/user/post',
    },
    product : {
        Feature : '/Feature',
        Integration : '/Integration',
        Security : '/Pricing',
    },
    profile: '/profile',
    post: '/post',
    admin: '/admin',
    logout: '/logout',
    forgotPassword: '/forgot-password',
    board:{
        flowchart:'/board/flowchart/:id',
        brainwriting:'/board/brainwriting/:id',
        intelligentTemplates:'/board/intelligentTemplates/:id',
        kanbanFramework:'/board/kanbanFramework/:id',
        mindMap:'/board/mindMap/:id',
        quickRetrospective:'/board/quickRetrospective/:id',
    },
}

export default path