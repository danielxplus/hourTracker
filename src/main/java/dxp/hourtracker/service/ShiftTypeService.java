package dxp.hourtracker.service;

import dxp.hourtracker.entity.ShiftType;
import dxp.hourtracker.repository.ShiftTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShiftTypeService {

    private final ShiftTypeRepository shiftTypeRepository;

    public List<ShiftType> getAll() {
        return shiftTypeRepository.findAll();
    }
}



