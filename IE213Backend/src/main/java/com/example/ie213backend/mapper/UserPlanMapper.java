package com.example.ie213backend.mapper;

import com.example.ie213backend.domain.dto.PaymentDto.UserPlansDto;
import com.example.ie213backend.domain.model.UserPlans;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserPlanMapper {
    UserPlans toEntity(UserPlansDto userPlansDto);

    UserPlansDto toDto(UserPlans userPlans);
}
