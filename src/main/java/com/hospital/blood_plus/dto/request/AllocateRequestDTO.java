package com.hospital.blood_plus.dto.request;
 
import java.util.List;
 
public class AllocateRequestDTO {
    private List<Long> bagIds;
 
    public List<Long> getBagIds() { return bagIds; }
    public void setBagIds(List<Long> bagIds) { this.bagIds = bagIds; }
}