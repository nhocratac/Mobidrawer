import env from "@/utils/environment";
import axios from "axios";

const httpRequest = axios.create({
    baseURL: env.NEXT_PUBLIC_BACKEND_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

const getAllTemplates = async () => {
    try {
        const response = await httpRequest.get("/template/all");
        return response.data;
    } catch (error) {
        throw error;
    }
}


const getTemplates = async (params: { page: number; size: number; search?: string }) => {
    try {
        const response = await httpRequest.get("/template", { params });
        return response.data;
    } catch (error) {
        throw error;
    }
}


const getTemplateById = async (id: string) => {
    try {
        const response = await httpRequest.get("/template/" + id);
        return response.data;
    } catch (error) {
        throw error;
    }
}


const createTemplate = async (data: {
    title: string;
    description: string;
    isPublic: boolean;
    previewImageUrl: string;
    canvasPaths: {}[],
    stickyNotes: {}[],
}) => {
    try {
        const response = await httpRequest.post("/template", data);
        return response.data;
    } catch (error) {
        throw error;
    }
}

const usingTemplate = async (templatId: string) => {
    try {
        const response = await httpRequest.post("/template/using/template/" + templatId);
        return response.data;
    } catch (error) {
     throw error   
    }
}

const templatesApi = {

    getTemplates,
    createTemplate,
    usingTemplate,
    getTemplateById,
    getAllTemplates
};

export default templatesApi;