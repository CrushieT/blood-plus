package com.hospital.blood_plus.dto.response;

import java.util.List;

/**
 * Generic paginated response wrapper
 */
public class PaginatedResponse<T> {
    private List<T> data;
    private int currentPage;
    private int totalPages;
    private long totalElements;
    private int pageSize;

    public PaginatedResponse() {}

    public PaginatedResponse(List<T> data, int currentPage, int totalPages, long totalElements, int pageSize) {
        this.data = data;
        this.currentPage = currentPage;
        this.totalPages = totalPages;
        this.totalElements = totalElements;
        this.pageSize = pageSize;
    }

    // Getters & Setters
    public List<T> getData() {
        return data;
    }

    public void setData(List<T> data) {
        this.data = data;
    }

    public int getCurrentPage() {
        return currentPage;
    }

    public void setCurrentPage(int currentPage) {
        this.currentPage = currentPage;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }

    public int getPageSize() {
        return pageSize;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }
}